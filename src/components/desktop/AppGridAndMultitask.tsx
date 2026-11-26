import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AppWindow,
  Calculator,
  FileEdit,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  AetherConfig,
  DesktopAppId,
  DesktopWindowState,
  WidgetId,
  WorkspaceInfo,
} from '../../types/aether';
import { APP_STORE_CATALOG, MULTITASK_LAYOUT_PRESETS, WIDGET_CATALOG } from '../../data/osCatalog';
import { LEGACY_APPS } from '../../data/presets';
import { LayoutDiagramGlyph } from './DesktopContextMenu';

export interface AppGridEntry {
  id: DesktopAppId;
  name: string;
  subtitle: string;
  group: 'native' | 'legacy' | 'store';
  icon: React.ReactNode;
}

export function getAppIcon(id: DesktopAppId, className = 'h-5 w-5'): React.ReactNode {
  switch (id) {
    case 'polyfs':
      return <FolderOpen className={className} />;
    case 'appstore':
      return <ShoppingBag className={className} />;
    case 'settings':
      return <Settings className={className} />;
    case 'notes':
      return <FileEdit className={className} />;
    case 'calc':
      return <Calculator className={className} />;
    case 'media':
      return <ImageIcon className={className} />;
    case 'browser':
      return <Globe className={className} />;
    case 'aethervmm':
      return <Layers className={className} />;
    case 'taskmanager':
      return <Activity className={className} />;
    case 'terminal':
      return <Terminal className={className} />;
    default:
      return <AppWindow className={className} />;
  }
}

interface AppGridOverlayProps {
  config: AetherConfig;
  installedStoreIds: string[];
  isLight: boolean;
  onLaunch: (id: DesktopAppId) => void;
  onClose: () => void;
}

export const AppGridOverlay: React.FC<AppGridOverlayProps> = ({
  config,
  installedStoreIds,
  isLight,
  onLaunch,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'native' | 'legacy' | 'store'>('all');

  const nativeEntries: AppGridEntry[] = [
    { id: 'polyfs', name: 'Arquivos & PolyFS', subtitle: 'Unidades, Pastas e Universal', group: 'native', icon: getAppIcon('polyfs', 'h-6 w-6') },
    { id: 'appstore', name: 'AetherStore', subtitle: 'Loja de Aplicativos', group: 'native', icon: getAppIcon('appstore', 'h-6 w-6') },
    { id: 'settings', name: 'Configurações', subtitle: 'Sistema, Contas e Docker', group: 'native', icon: getAppIcon('settings', 'h-6 w-6') },
    { id: 'notes', name: 'AetherNotes', subtitle: 'Editor de Notas e Código', group: 'native', icon: getAppIcon('notes', 'h-6 w-6') },
    { id: 'calc', name: 'AetherCalc', subtitle: 'Científica e DEC/HEX/BIN', group: 'native', icon: getAppIcon('calc', 'h-6 w-6') },
    { id: 'media', name: 'AetherMedia', subtitle: 'Galeria e Visualizador', group: 'native', icon: getAppIcon('media', 'h-6 w-6') },
    { id: 'browser', name: 'AetherWeb', subtitle: 'Navegador e Docs do SO', group: 'native', icon: getAppIcon('browser', 'h-6 w-6') },
    { id: 'aethervmm', name: 'AetherVMM', subtitle: 'Virtualizador Multi-SO', group: 'native', icon: getAppIcon('aethervmm', 'h-6 w-6') },
    { id: 'taskmanager', name: 'Tarefas', subtitle: 'Monitor Chronos', group: 'native', icon: getAppIcon('taskmanager', 'h-6 w-6') },
    { id: 'terminal', name: 'AetherShell', subtitle: 'Console Nativo', group: 'native', icon: getAppIcon('terminal', 'h-6 w-6') },
  ];

  const legacyEntries: AppGridEntry[] = LEGACY_APPS.map((l) => ({
    id: l.id as DesktopAppId,
    name: l.name,
    subtitle: `${l.platformLabel} · ${l.binaryName}`,
    group: 'legacy',
    icon: getAppIcon(l.id as DesktopAppId, 'h-6 w-6'),
  }));

  const storeEntries: AppGridEntry[] = APP_STORE_CATALOG.filter((s) =>
    installedStoreIds.includes(s.id)
  ).map((s) => ({
    id: s.id as DesktopAppId,
    name: s.name,
    subtitle: `${s.category} · ${s.packageFormat}`,
    group: 'store',
    icon: getAppIcon(s.id as DesktopAppId, 'h-6 w-6'),
  }));

  const allEntries = [...nativeEntries, ...storeEntries, ...legacyEntries].filter((item) => {
    if (filter !== 'all' && item.group !== filter) return false;
    return (
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClose}
      className={`absolute inset-0 z-50 flex flex-col p-6 backdrop-blur-2xl ${
        isLight ? 'bg-slate-100/80 text-slate-900' : 'bg-[#070B12]/80 text-slate-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex h-full w-full max-w-4xl flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Grade de Aplicativos</h3>
            <p className="text-xs opacity-70">
              {allEntries.length} aplicativo(s) disponíveis no perfil atual
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/10 p-2 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar aplicativo nativo, da loja ou legado..."
              autoFocus
              className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs focus:border-sky-400 focus:outline-none ${
                isLight
                  ? 'border-slate-900/15 bg-white/75'
                  : 'border-white/15 bg-white/5'
              }`}
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-black/25 p-1 text-xs">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'native', label: 'Nativos' },
                { id: 'store', label: 'Instalados' },
                { id: 'legacy', label: 'Virtualizados' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'text-slate-950'
                    : 'opacity-75 hover:opacity-100'
                }`}
                style={
                  filter === tab.id ? { backgroundColor: config.visual.accentColor } : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid flex-1 grid-cols-2 gap-3 overflow-y-auto pb-6 sm:grid-cols-3 md:grid-cols-4">
          {allEntries.map((app) => (
            <motion.button
              key={app.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onLaunch(app.id);
                onClose();
              }}
              className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-colors ${
                isLight
                  ? 'border-slate-900/12 bg-white/70 hover:bg-white'
                  : 'border-white/12 bg-white/5 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-950 shadow-md"
                style={{ backgroundColor: config.visual.accentColor }}
              >
                {app.icon}
              </div>
              <div className="mt-2.5 w-full truncate text-xs font-semibold">{app.name}</div>
              <div className="mt-0.5 w-full truncate text-[11px] opacity-65">{app.subtitle}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

interface MultitaskOverviewProps {
  config: AetherConfig;
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: number;
  windows: DesktopWindowState[];
  isLight: boolean;
  onSelectWorkspace: (wsId: number) => void;
  onAddWorkspace: () => void;
  onRemoveWorkspace: (wsId: number) => void;
  onFocusWindow: (id: DesktopAppId) => void;
  onCloseWindow: (id: DesktopAppId) => void;
  onMoveWindowToWorkspace: (id: DesktopAppId, wsId: number) => void;
  onApplyLayoutPreset: (
    preset: 'split-50' | 'master-stack' | 'three-cols' | 'grid-2x2' | 'center-focus' | 'cascade'
  ) => void;
  onClose: () => void;
}

export const MultitaskOverviewOverlay: React.FC<MultitaskOverviewProps> = ({
  config,
  workspaces,
  activeWorkspaceId,
  windows,
  isLight,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  onFocusWindow,
  onCloseWindow,
  onMoveWindowToWorkspace,
  onApplyLayoutPreset,
  onClose,
}) => {
  const currentWsWindows = windows.filter(
    (w) => w.isOpen && w.workspaceId === activeWorkspaceId
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClose}
      className={`absolute inset-0 z-50 flex flex-col p-6 backdrop-blur-2xl ${
        isLight ? 'bg-slate-100/85 text-slate-900' : 'bg-[#070B12]/85 text-slate-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex h-full w-full max-w-5xl flex-col"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Multitarefa, Layouts Automáticos e Áreas de Trabalho
            </h3>
            <p className="text-xs opacity-70">
              Escolha um dos 6 esquemas pré-programados ou mova janelas entre áreas virtuais.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/10 p-2 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 6 Pre-Programmed Layout Presets Strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {MULTITASK_LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={currentWsWindows.length === 0}
              onClick={() => {
                onApplyLayoutPreset(preset.id);
                onClose();
              }}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors disabled:opacity-40 ${
                isLight
                  ? 'border-slate-900/12 bg-white/70 hover:border-sky-500 hover:bg-white'
                  : 'border-white/12 bg-white/5 hover:border-sky-400/60 hover:bg-white/10'
              }`}
            >
              <LayoutDiagramGlyph preset={preset.id} accent={config.visual.accentColor} />
              <span className="text-[11px] font-medium leading-tight">{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Workspaces Strip */}
        <div className="mt-4 flex items-center gap-2.5 overflow-x-auto pb-2">
          {workspaces.map((ws) => {
            const count = windows.filter((w) => w.isOpen && w.workspaceId === ws.id).length;
            const active = ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-colors ${
                  active
                    ? 'border-sky-400 bg-sky-500/15'
                    : isLight
                      ? 'border-slate-900/15 bg-white/70 hover:bg-white'
                      : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectWorkspace(ws.id)}
                  className="text-left"
                >
                  <div className="text-xs font-semibold">{ws.name}</div>
                  <div className="font-mono text-[11px] opacity-70 tabular-nums">
                    {count} janela(s)
                  </div>
                </button>
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    title="Remover área de trabalho"
                    onClick={() => onRemoveWorkspace(ws.id)}
                    className="rounded p-1 opacity-60 hover:bg-red-500/20 hover:text-red-400 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddWorkspace}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed px-4 py-3 text-xs font-medium ${
              isLight
                ? 'border-slate-900/25 hover:bg-white/70'
                : 'border-white/25 hover:bg-white/10'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Nova Área</span>
          </button>
        </div>

        {/* Windows Grid in Current Workspace */}
        <div className="mt-5 flex-1 overflow-y-auto">
          {currentWsWindows.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 text-xs opacity-70">
              <span>Nenhuma janela aberta nesta área de trabalho.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentWsWindows.map((win) => (
                <div
                  key={win.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 ${
                    isLight
                      ? 'border-slate-900/15 bg-white/80'
                      : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFocusWindow(win.id);
                        onClose();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {getAppIcon(win.id, 'h-4 w-4 shrink-0')}
                        <span className="truncate text-sm font-semibold">{win.title}</span>
                      </div>
                      <div className="mt-1 text-xs opacity-70">
                        {win.subtitle} · <span className="font-mono tabular-nums">{win.ramMb} MB</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCloseWindow(win.id)}
                      className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px]">
                    <span className="opacity-70">Mover para:</span>
                    <div className="flex flex-wrap gap-1">
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          disabled={ws.id === win.workspaceId}
                          onClick={() => onMoveWindowToWorkspace(win.id, ws.id)}
                          className={`rounded px-2 py-0.5 font-mono transition-colors ${
                            ws.id === win.workspaceId
                              ? 'bg-sky-500/25 text-sky-300'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {ws.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface WidgetManagerPopoverProps {
  enabledWidgets: WidgetId[];
  isLight: boolean;
  glassStyle: React.CSSProperties;
  isTopBarLayout: boolean;
  onToggleWidget: (id: WidgetId) => void;
  onClose: () => void;
}

export const WidgetManagerPopover: React.FC<WidgetManagerPopoverProps> = ({
  enabledWidgets,
  isLight,
  glassStyle,
  isTopBarLayout,
  onToggleWidget,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: isTopBarLayout ? -8 : 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      onClick={(e) => e.stopPropagation()}
      style={glassStyle}
      className={`absolute z-50 w-[310px] max-w-[calc(100%-24px)] border p-4 shadow-2xl ${
        isLight ? 'border-slate-900/15' : 'border-white/15'
      } ${isTopBarLayout ? 'left-4 top-12' : 'bottom-14 left-3'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold">Widgets da Área de Trabalho</div>
          <div className="text-[11px] opacity-70">Vinculados ao perfil do usuário atual</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {WIDGET_CATALOG.map((w) => {
          const enabled = enabledWidgets.includes(w.id);
          return (
            <label
              key={w.id}
              className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-2.5 transition-colors ${
                isLight
                  ? 'border-slate-900/10 hover:bg-slate-900/5'
                  : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <div>
                <div className="text-xs font-medium">{w.name}</div>
                <div className="text-[11px] opacity-70">{w.description}</div>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onToggleWidget(w.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400"
              />
            </label>
          );
        })}
      </div>
    </motion.div>
  );
};
