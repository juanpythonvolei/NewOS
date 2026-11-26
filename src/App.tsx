import React, { useEffect, useMemo, useState } from 'react';
import { Download, SlidersHorizontal, X } from 'lucide-react';
import {
  AetherConfig,
  DesktopAppId,
  FileFolder,
  OsUserAccount,
  PolyFileEntry,
  SavedProfile,
  StorageDriveId,
  WidgetId,
  WorkstationView,
} from './types/aether';
import { DEFAULT_CONFIG, QUICK_PRESETS, SAMPLE_POLY_FILES } from './data/presets';
import { DEFAULT_OS_USERS, INITIAL_FOLDERS } from './data/osCatalog';
import {
  computeSystemFootprint,
  generateOsSourceFiles,
  validateBuildConfig,
} from './engine/codegen';
import { exportAetherBundleZip } from './engine/zipExporter';
import { MetricsSidebar } from './components/MetricsSidebar';
import { DesktopSimulator } from './components/desktop/DesktopSimulator';
import { AetherLangStudio } from './components/studio/AetherLangStudio';
import { CompatMatrixView } from './components/studio/CompatMatrixView';
import { BuildExplorerView } from './components/studio/BuildExplorerView';

const STORAGE_USERS_KEY = 'aetheros_studio_os_users_v2';
const STORAGE_ACTIVE_USER_KEY = 'aetheros_studio_active_user_v2';
const STORAGE_PROFILES_KEY = 'aetheros_studio_saved_profiles_v1';

function normalizeUserAccount(u: OsUserAccount): OsUserAccount {
  return {
    ...u,
    config: {
      ...DEFAULT_CONFIG,
      ...u.config,
      visual: {
        ...DEFAULT_CONFIG.visual,
        ...(u.config?.visual ?? {}),
        animationProfile: u.config?.visual?.animationProfile ?? 'fluid',
        taskbarLivePreview: u.config?.visual?.taskbarLivePreview ?? true,
      },
      operational: {
        ...DEFAULT_CONFIG.operational,
        ...(u.config?.operational ?? {}),
      },
      compat: {
        ...DEFAULT_CONFIG.compat,
        ...(u.config?.compat ?? {}),
      },
      language: {
        ...DEFAULT_CONFIG.language,
        ...(u.config?.language ?? {}),
      },
    },
    widgetWidths: u.widgetWidths ?? {},
  };
}

function loadStoredUsers(): OsUserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) return DEFAULT_OS_USERS.map(normalizeUserAccount);
    const parsed = JSON.parse(raw) as OsUserAccount[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_OS_USERS.map(normalizeUserAccount);
    }
    return parsed.map(normalizeUserAccount);
  } catch {
    return DEFAULT_OS_USERS.map(normalizeUserAccount);
  }
}

function loadActiveUserId(users: OsUserAccount[]): string {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (raw && users.some((u) => u.id === raw)) return raw;
  } catch {
    // ignore
  }
  return users[0].id;
}

function loadSavedProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [users, setUsers] = useState<OsUserAccount[]>(loadStoredUsers);
  const [activeUserId, setActiveUserId] = useState<string>(() =>
    loadActiveUserId(loadStoredUsers())
  );
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(loadSavedProfiles);
  const [activeView, setActiveView] = useState<WorkstationView>('desktop');

  const [polyFiles, setPolyFiles] = useState<PolyFileEntry[]>(SAMPLE_POLY_FILES);
  const [folders, setFolders] = useState<FileFolder[]>(INITIAL_FOLDERS);
  const [selectedPolyFileId, setSelectedPolyFileId] = useState<string>(SAMPLE_POLY_FILES[0].id);

  const [externalOpenRequest, setExternalOpenRequest] = useState<{
    appId: DesktopAppId;
    nonce: number;
  } | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeUserId) ?? users[0],
    [users, activeUserId]
  );

  const config = activeUser.config;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore quota error
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_USER_KEY, activeUserId);
    } catch {
      // ignore
    }
  }, [activeUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(savedProfiles));
    } catch {
      // ignore
    }
  }, [savedProfiles]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const updateActiveUser = (updater: (u: OsUserAccount) => OsUserAccount) => {
    setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? updater(u) : u)));
  };

  const handleSetConfig = (nextConfig: AetherConfig) => {
    updateActiveUser((u) => ({ ...u, config: nextConfig }));
  };

  const footprint = useMemo(() => computeSystemFootprint(config), [config]);
  const generatedFiles = useMemo(() => generateOsSourceFiles(config), [config]);
  const buildChecks = useMemo(
    () => validateBuildConfig(config, footprint),
    [config, footprint]
  );

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const result = await exportAetherBundleZip(config, generatedFiles);
      showToast(
        `Pacote ${result.filename} gerado (${result.fileCount} arquivos + Docker, ${(result.sizeBytes / 1024).toFixed(1)} KB).`
      );
    } catch {
      showToast('Não foi possível gerar o arquivo ZIP. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProfile = (name: string) => {
    const profile: SavedProfile = {
      id: `prof-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      config,
    };
    setSavedProfiles((prev) => [profile, ...prev]);
    showToast(`Perfil "${name}" salvo localmente.`);
  };

  const handleCreateOsUser = (payload: {
    displayName: string;
    username: string;
    pin: string;
    role: OsUserAccount['role'];
    presetId: string;
    avatarColor: string;
  }): OsUserAccount => {
    const presetConfig =
      QUICK_PRESETS.find((p) => p.id === payload.presetId)?.config ?? DEFAULT_CONFIG;
    const initials = payload.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('');

    const created: OsUserAccount = {
      id: `user-${Date.now()}`,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role,
      pin: payload.pin,
      avatarColor: payload.avatarColor,
      initials: initials || 'US',
      config: presetConfig,
      enabledWidgets: ['clock', 'telemetry', 'quick-notes'],
      widgetWidths: { clock: 224, telemetry: 232, 'quick-notes': 232 },
      quickNoteText: `Perfil de ${payload.displayName}\n• Personalize widgets e aplicativos livremente.`,
      installedStoreAppIds: ['store-aethercode'],
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, created]);
    setActiveUserId(created.id);
    showToast(`Conta "${created.displayName}" criada e vinculada ao seu perfil.`);
    return created;
  };

  const handleSwitchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setActiveUserId(userId);
    showToast(`Sessão alternada para ${target.displayName} (${target.config.visual.codename}).`);
  };

  const handleToggleWidget = (widgetId: WidgetId) => {
    updateActiveUser((u) => {
      const exists = u.enabledWidgets.includes(widgetId);
      return {
        ...u,
        enabledWidgets: exists
          ? u.enabledWidgets.filter((id) => id !== widgetId)
          : [...u.enabledWidgets, widgetId],
      };
    });
  };

  const handleResizeWidget = (widgetId: WidgetId, nextWidth: number) => {
    const clamped = Math.max(185, Math.min(360, Math.round(nextWidth)));
    updateActiveUser((u) => ({
      ...u,
      widgetWidths: {
        ...(u.widgetWidths ?? {}),
        [widgetId]: clamped,
      },
    }));
  };

  const handleInstallStoreApp = (appId: string) => {
    updateActiveUser((u) => ({
      ...u,
      installedStoreAppIds: u.installedStoreAppIds.includes(appId)
        ? u.installedStoreAppIds
        : [...u.installedStoreAppIds, appId],
    }));
    showToast('Aplicativo instalado e adicionado à Grade de Aplicativos.');
  };

  const handleUninstallStoreApp = (appId: string) => {
    updateActiveUser((u) => ({
      ...u,
      installedStoreAppIds: u.installedStoreAppIds.filter((id) => id !== appId),
    }));
    showToast('Aplicativo removido do perfil atual.');
  };

  const handleCreateFolder = (name: string, driveId: StorageDriveId) => {
    const created: FileFolder = {
      id: `folder-${Date.now()}`,
      name,
      driveId,
    };
    setFolders((prev) => [...prev.slice(0, -1), created, prev[prev.length - 1]]);
    showToast(`Pasta "${name}" criada na unidade selecionada.`);
  };

  const handleToggleTrashFile = (id: string) => {
    setPolyFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isTrashed: !f.isTrashed } : f))
    );
  };

  const handleSaveNoteDocument = (filename: string, content: string) => {
    const entry: PolyFileEntry = {
      id: `note-${Date.now()}`,
      name: filename,
      extension: filename.includes('.') ? `.${filename.split('.').pop()}` : '.txt',
      originOs: `${config.visual.osName} (${activeUser.username})`,
      platform: 'aether',
      category: 'document',
      sizeBytes: content.length,
      magicHex: '54 45 58 54 20 55 54 46',
      decoder: 'PolyFS.TextStream',
      summary: `Salvo pelo AetherNotes na pasta /Documentos de ${activeUser.displayName}.`,
      previewText: content,
      driveId: 'drive-aether',
      folderId: 'folder-docs',
      ownerUserId: activeUser.id,
    };
    setPolyFiles((prev) => [entry, ...prev]);
    setSelectedPolyFileId(entry.id);
    showToast(`"${filename}" salvo em /Documentos.`);
  };

  const handleOpenSampleInDesktop = (sampleFileId: string) => {
    setSelectedPolyFileId(sampleFileId);
    setActiveView('desktop');
    setExternalOpenRequest({ appId: 'polyfs', nonce: Date.now() });
  };

  const handleLaunchLegacyInDesktop = (appId: DesktopAppId) => {
    setActiveView('desktop');
    setExternalOpenRequest({ appId, nonce: Date.now() });
  };

  const navItems: Array<{ id: WorkstationView; label: string }> = [
    { id: 'desktop', label: 'Desktop ao Vivo' },
    { id: 'language', label: 'AetherLang' },
    { id: 'compat', label: 'PolyFS e VMM' },
    { id: 'build', label: 'Build e Docker' },
  ];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0F17] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-8 border-b border-white/10 bg-[#0E1420] px-5">
        <button
          type="button"
          onClick={() => setActiveView('desktop')}
          className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          AetherOS Studio
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`relative py-4 whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportZip}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-300 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Empacotando ISO...' : 'Baixar Kit ISO (.zip)'}</span>
          </button>
        </div>
      </header>

      {/* Compact Mobile Nav & Sidebar Trigger */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#111827] px-3 py-2 md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                activeView === item.id ? 'bg-[#1E293B] text-white' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1 text-xs text-slate-200 whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Métricas</span>
        </button>
      </div>

      {/* Main Workspace Canvas */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Persistent Sidebar */}
        <div className="hidden lg:flex lg:h-full">
          <MetricsSidebar
            config={config}
            footprint={footprint}
            savedProfiles={savedProfiles}
            onChange={handleSetConfig}
            onReset={() => {
              handleSetConfig(DEFAULT_CONFIG);
              showToast(`Perfil de ${activeUser.displayName} restaurado ao padrão.`);
            }}
            onSaveProfile={handleSaveProfile}
            onLoadProfile={(sp) => {
              handleSetConfig(sp.config);
              showToast(`Perfil "${sp.name}" aplicado à conta ${activeUser.displayName}.`);
            }}
            onImportJson={(cfg) => {
              handleSetConfig(cfg);
              showToast('Configuração JSON importada para a conta ativa.');
            }}
          />
        </div>

        {/* Tablet/Mobile Slide-over Metrics Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="relative flex h-full w-[310px] max-w-[85vw] flex-col bg-[#111827] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-display text-sm font-semibold text-white">
                  Métricas do Sistema
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <MetricsSidebar
                  config={config}
                  footprint={footprint}
                  savedProfiles={savedProfiles}
                  onChange={handleSetConfig}
                  onReset={() => {
                    handleSetConfig(DEFAULT_CONFIG);
                    showToast('Configurações restauradas.');
                  }}
                  onSaveProfile={handleSaveProfile}
                  onLoadProfile={(sp) => {
                    handleSetConfig(sp.config);
                    setMobileDrawerOpen(false);
                    showToast(`Perfil "${sp.name}" carregado.`);
                  }}
                  onImportJson={(cfg) => {
                    handleSetConfig(cfg);
                    setMobileDrawerOpen(false);
                    showToast('Configuração JSON importada.');
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar painel"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex-1 bg-black/60 backdrop-blur-xs"
            />
          </div>
        )}

        {/* Primary Stage Viewport */}
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="hidden md:inline-flex lg:hidden fixed bottom-4 left-4 z-40 items-center gap-2 rounded-lg border border-white/15 bg-[#111827] px-3.5 py-2 text-xs font-medium text-white shadow-lg hover:border-sky-400"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Ajustar Métricas</span>
          </button>

          {activeView === 'desktop' && (
            <DesktopSimulator
              config={config}
              footprint={footprint}
              users={users}
              activeUser={activeUser}
              polyFiles={polyFiles}
              folders={folders}
              selectedPolyFileId={selectedPolyFileId}
              onSelectPolyFile={setSelectedPolyFileId}
              onAddPolyFile={(entry) => {
                setPolyFiles((prev) => [entry, ...prev]);
                showToast(`Arquivo "${entry.name}" adicionado ao PolyFS.`);
              }}
              onToggleTrashFile={handleToggleTrashFile}
              onCreateFolder={handleCreateFolder}
              onSaveNoteDocument={handleSaveNoteDocument}
              onUpdateConfig={handleSetConfig}
              onToggleWidget={handleToggleWidget}
              onResizeWidget={handleResizeWidget}
              onUpdateQuickNote={(text) =>
                updateActiveUser((u) => ({ ...u, quickNoteText: text }))
              }
              onInstallStoreApp={handleInstallStoreApp}
              onUninstallStoreApp={handleUninstallStoreApp}
              onSwitchUser={handleSwitchUser}
              onCreateUser={handleCreateOsUser}
              onExportZip={handleExportZip}
              externalOpenRequest={externalOpenRequest}
            />
          )}

          {activeView === 'language' && <AetherLangStudio config={config} />}

          {activeView === 'compat' && (
            <CompatMatrixView
              config={config}
              onChangeConfig={handleSetConfig}
              onOpenSampleInDesktop={handleOpenSampleInDesktop}
              onLaunchLegacyInDesktop={handleLaunchLegacyInDesktop}
            />
          )}

          {activeView === 'build' && (
            <BuildExplorerView
              config={config}
              footprint={footprint}
              files={generatedFiles}
              checks={buildChecks}
              onExportZip={handleExportZip}
              isExporting={isExporting}
            />
          )}
        </main>
      </div>

      {/* Subtle Completion Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-sky-400/40 bg-[#111827] px-4 py-2.5 text-xs font-medium text-slate-100 shadow-2xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
