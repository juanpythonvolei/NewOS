import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FilePlus,
  Folder,
  FolderPlus,
  HardDrive,
  Lock,
  Play,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  UserPlus,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AetherConfig,
  AnimationProfile,
  DesktopAppId,
  ErgonomicParadigm,
  FileFolder,
  HardwareProfileId,
  MemorySafetyModel,
  MultitaskLayoutPreset,
  OsUserAccount,
  PolyFileEntry,
  SchedulerPolicy,
  StorageDriveId,
  SystemFootprint,
  WidgetId,
} from '../../types/aether';
import {
  APP_STORE_CATALOG,
  MULTITASK_LAYOUT_PRESETS,
  STORAGE_DRIVES,
  WIDGET_CATALOG,
} from '../../data/osCatalog';
import { ACCENT_SWATCHES, QUICK_PRESETS, WALLPAPERS } from '../../data/presets';
import { ContextMenuItem, LayoutDiagramGlyph } from './DesktopContextMenu';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function classifyLocalFile(file: File, magicHex: string): {
  originOs: string;
  platform: PolyFileEntry['platform'];
  category: PolyFileEntry['category'];
  decoder: string;
  launchableAppId?: string;
} {
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? `.${name.split('.').pop()}` : 'bin';
  if (ext === '.exe' || ext === '.msi' || magicHex.startsWith('4D 5A')) {
    return {
      originOs: 'Windows',
      platform: 'win32',
      category: 'executable',
      decoder: 'PE32+ Loader → AetherVMM.Win32Bridge',
      launchableAppId: 'legacy-win32',
    };
  }
  if (ext === '.apk' || ext === '.aab') {
    return {
      originOs: 'Android',
      platform: 'android',
      category: 'executable',
      decoder: 'APK/DEX Unpacker → AetherVMM.ArtBinderBridge',
      launchableAppId: 'legacy-android',
    };
  }
  if (ext === '.dmg' || ext === '.pkg') {
    return {
      originOs: 'macOS',
      platform: 'macos',
      category: 'executable',
      decoder: 'UDIF/APFS Mounter → AetherVMM.MachCocoaBridge',
      launchableAppId: 'legacy-macos',
    };
  }
  if (ext === '.appimage' || ext === '.deb' || ext === '.rpm' || magicHex.startsWith('7F 45 4C 46')) {
    return {
      originOs: 'Linux',
      platform: 'linux',
      category: 'executable',
      decoder: 'ELF64 Reader → AetherVMM.ElfSyscallBridge',
      launchableAppId: 'legacy-linux',
    };
  }
  if (ext === '.aeth') {
    return {
      originOs: 'AetherOS Nativo',
      platform: 'aether',
      category: 'source',
      decoder: 'AetherLang Native AST Parser (aethc)',
    };
  }
  if (file.type.startsWith('image/')) {
    return {
      originOs: 'Multi-SO (Imagem)',
      platform: 'aether',
      category: 'media',
      decoder: 'PolyFS.MediaCodec Hardware Decoder',
    };
  }
  return {
    originOs: 'Universal',
    platform: 'aether',
    category: 'document',
    decoder: `PolyFS.UniversalStream (${ext})`,
  };
}

/* ============================================================================
   1. FULL OS FILE MANAGER (DRIVES + FOLDERS + RIGHT-CLICK + POLYFS INSPECTOR)
   ============================================================================ */
interface FullFileManagerProps {
  config: AetherConfig;
  files: PolyFileEntry[];
  folders: FileFolder[];
  selectedFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (entry: PolyFileEntry) => void;
  onToggleTrashFile: (id: string) => void;
  onCreateFolder: (name: string, driveId: StorageDriveId) => void;
  onLaunchApp: (appId: DesktopAppId) => void;
  onOpenContextMenu: (e: React.MouseEvent, header: string, items: ContextMenuItem[]) => void;
  isLight: boolean;
}

export const FullFileManagerApp: React.FC<FullFileManagerProps> = ({
  config,
  files,
  folders,
  selectedFileId,
  onSelectFile,
  onAddFile,
  onToggleTrashFile,
  onCreateFolder,
  onLaunchApp,
  onOpenContextMenu,
  isLight,
}) => {
  const [activeDriveId, setActiveDriveId] = useState<StorageDriveId | 'all'>('all');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [creatingMode, setCreatingMode] = useState<'none' | 'folder' | 'file'>('none');
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/55' : 'bg-slate-950/45';

  const isTrashView = activeFolderId === 'folder-trash';

  const visibleFiles = files.filter((f) => {
    if (isTrashView) return Boolean(f.isTrashed);
    if (f.isTrashed) return false;
    if (activeDriveId !== 'all' && f.driveId !== activeDriveId) return false;
    if (activeFolderId !== 'all' && activeFolderId !== 'folder-home' && f.folderId !== activeFolderId) {
      return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.originOs.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedFile =
    visibleFiles.find((f) => f.id === selectedFileId) ?? visibleFiles[0] ?? null;

  const ingestFile = (file: File) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : 'bin';
    const reader = new FileReader();
    reader.onload = () => {
      const buf = new Uint8Array(reader.result as ArrayBuffer);
      const hex = Array.from(buf.slice(0, 8))
        .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');
      const info = classifyLocalFile(file, hex);

      const finish = (previewText?: string, previewImageUrl?: string) => {
        const targetDrive: StorageDriveId =
          activeDriveId === 'all' ? 'drive-aether' : activeDriveId;
        const targetFolder =
          activeFolderId === 'all' || activeFolderId === 'folder-trash'
            ? 'folder-docs'
            : activeFolderId;

        const entry: PolyFileEntry = {
          id: `user-file-${Date.now()}`,
          name: file.name,
          extension: ext,
          originOs: info.originOs,
          platform: info.platform,
          category: info.category,
          sizeBytes: file.size,
          magicHex: hex || '00 00 00 00',
          decoder: info.decoder,
          summary: `Arquivo local montado em ${targetDrive} sob política ${config.compat.sandboxPolicy}.`,
          previewText,
          previewImageUrl,
          isUserUploaded: true,
          launchableAppId: info.launchableAppId,
          driveId: targetDrive,
          folderId: targetFolder,
        };
        onAddFile(entry);
        onSelectFile(entry.id);
      };

      if (file.type.startsWith('image/')) {
        finish(`Imagem local (${file.type}) · ${formatBytes(file.size)}`, URL.createObjectURL(file));
      } else if (
        file.type.startsWith('text/') ||
        ['.json', '.md', '.txt', '.aeth', '.ts', '.js', '.py', '.toml', '.csv'].includes(ext.toLowerCase())
      ) {
        const txtReader = new FileReader();
        txtReader.onload = () => finish(String(txtReader.result ?? '').slice(0, 1800));
        txtReader.readAsText(file.slice(0, 4096));
      } else {
        finish(`Assinatura hexadecimal (Magic Bytes):\n${hex}\n\nRota PolyFS: ${info.decoder}`);
      }
    };
    reader.readAsArrayBuffer(file.slice(0, 16));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const targetDrive: StorageDriveId = activeDriveId === 'all' ? 'drive-aether' : activeDriveId;
    if (creatingMode === 'folder') {
      onCreateFolder(trimmed, targetDrive);
    } else if (creatingMode === 'file') {
      const hasExt = trimmed.includes('.');
      const finalName = hasExt ? trimmed : `${trimmed}.aeth`;
      const ext = `.${finalName.split('.').pop()}`;
      const folderId =
        activeFolderId === 'all' || activeFolderId === 'folder-trash'
          ? 'folder-docs'
          : activeFolderId;
      const entry: PolyFileEntry = {
        id: `created-${Date.now()}`,
        name: finalName,
        extension: ext,
        originOs: ext === '.aeth' ? 'AetherOS Nativo' : 'Documento Local',
        platform: 'aether',
        category: ext === '.aeth' ? 'source' : 'document',
        sizeBytes: 256,
        magicHex: '41 45 54 48 00 01 00 00',
        decoder: ext === '.aeth' ? 'AetherLang AST Parser' : 'PolyFS.TextStream',
        summary: 'Arquivo criado diretamente no Gerenciador de Arquivos do AetherOS.',
        previewText:
          ext === '.aeth'
            ? `module user.${trimmed.replace(/[^a-zA-Z0-9_]/g, '_')}\n\nfn main() -> Void {\n  console.print("Executando em AetherOS")\n}`
            : `Documento criado em ${new Date().toLocaleString('pt-BR')}.`,
        driveId: targetDrive,
        folderId,
      };
      onAddFile(entry);
      onSelectFile(entry.id);
    }
    setNewName('');
    setCreatingMode('none');
  };

  const handleFileContextMenu = (e: React.MouseEvent, file: PolyFileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectFile(file.id);
    const items: ContextMenuItem[] = [
      {
        id: 'inspect',
        label: 'Inspecionar no PolyFS',
        onSelect: () => onSelectFile(file.id),
      },
    ];
    if (file.launchableAppId && !file.isTrashed) {
      items.push({
        id: 'run-vmm',
        label: 'Executar no AetherVMM',
        onSelect: () => onLaunchApp(file.launchableAppId as DesktopAppId),
      });
    }
    items.push({
      id: 'duplicate',
      label: 'Duplicar Arquivo',
      onSelect: () => {
        const copy: PolyFileEntry = {
          ...file,
          id: `dup-${Date.now()}`,
          name: `copia_${file.name}`,
          isTrashed: false,
        };
        onAddFile(copy);
        onSelectFile(copy.id);
      },
    });
    items.push({
      id: 'trash',
      label: file.isTrashed ? 'Restaurar da Lixeira' : 'Mover para Lixeira',
      danger: !file.isTrashed,
      dividerBefore: true,
      onSelect: () => onToggleTrashFile(file.id),
    });
    onOpenContextMenu(e, file.name, items);
  };

  const currentDriveObj = STORAGE_DRIVES.find((d) => d.id === activeDriveId);
  const currentFolderObj = folders.find((f) => f.id === activeFolderId);

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) ingestFile(f);
      }}
    >
      {/* Top Action & Breadcrumb Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCls} px-3.5 py-2`}>
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveDriveId('all');
              setActiveFolderId('all');
            }}
            className="font-medium hover:underline"
          >
            Este Computador
          </button>
          {currentDriveObj && (
            <>
              <span className={mutedCls}>/</span>
              <span>
                {currentDriveObj.letter} {currentDriveObj.label}
              </span>
            </>
          )}
          {currentFolderObj && (
            <>
              <span className={mutedCls}>/</span>
              <span className="font-semibold">{currentFolderObj.name}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative w-40 sm:w-48">
            <Search className={`pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${mutedCls}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar arquivos..."
              className={`w-full rounded-md border ${borderCls} ${surfaceCls} py-1 pl-7 pr-2 text-xs focus:border-sky-400 focus:outline-none`}
            />
          </div>
          <button
            type="button"
            onClick={() => setCreatingMode((m) => (m === 'folder' ? 'none' : 'folder'))}
            title="Nova Pasta"
            className={`inline-flex items-center gap-1 rounded-md border ${borderCls} px-2 py-1 text-xs hover:border-sky-400`}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pasta</span>
          </button>
          <button
            type="button"
            onClick={() => setCreatingMode((m) => (m === 'file' ? 'none' : 'file'))}
            title="Novo Arquivo"
            className={`inline-flex items-center gap-1 rounded-md border ${borderCls} px-2 py-1 text-xs hover:border-sky-400`}
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Arquivo</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-950 whitespace-nowrap"
            style={{ backgroundColor: config.visual.accentColor }}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar Local</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ingestFile(f);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {creatingMode !== 'none' && (
        <form
          onSubmit={handleCreateSubmit}
          className={`flex items-center gap-2 border-b ${borderCls} bg-sky-500/10 px-3.5 py-2 text-xs`}
        >
          <span className="font-medium">
            {creatingMode === 'folder' ? 'Nova Pasta:' : 'Novo Arquivo (.aeth/.txt):'}
          </span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={creatingMode === 'folder' ? 'Ex.: Meus Projetos' : 'Ex.: driver_som.aeth'}
            autoFocus
            className={`flex-1 rounded border ${borderCls} ${surfaceCls} px-2.5 py-1 text-xs focus:border-sky-400 focus:outline-none`}
          />
          <button
            type="submit"
            className="rounded bg-sky-400 px-3 py-1 text-xs font-semibold text-slate-950"
          >
            Criar
          </button>
          <button
            type="button"
            onClick={() => setCreatingMode('none')}
            className={`text-xs ${mutedCls}`}
          >
            Cancelar
          </button>
        </form>
      )}

      {/* 3-Column OS Explorer */}
      <div className="grid min-h-0 flex-1 grid-cols-12">
        <div className={`col-span-4 sm:col-span-3 overflow-y-auto border-r ${borderCls} p-2.5 space-y-4`}>
          <div>
            <div className={`mb-1.5 px-1.5 text-[11px] font-semibold ${mutedCls}`}>Pastas</div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveDriveId('all');
                  setActiveFolderId('all');
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                  activeDriveId === 'all' && activeFolderId === 'all'
                    ? 'bg-sky-500/15 font-medium'
                    : 'hover:bg-white/5'
                }`}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="truncate">Todos os Arquivos</span>
              </button>
              {folders.map((folder) => {
                const active = activeFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setActiveFolderId(folder.id);
                      setActiveDriveId('all');
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                      active ? 'bg-sky-500/15 font-medium' : 'hover:bg-white/5'
                    }`}
                  >
                    {folder.id === 'folder-trash' ? (
                      <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    )}
                    <span className="truncate">{folder.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`border-t ${borderCls} pt-3`}>
            <div className={`mb-1.5 px-1.5 text-[11px] font-semibold ${mutedCls}`}>
              Unidades de Armazenamento
            </div>
            <div className="space-y-1.5">
              {STORAGE_DRIVES.map((drive) => {
                const active = activeDriveId === drive.id;
                const pct = Math.round((drive.usedGb / drive.totalGb) * 100);
                return (
                  <button
                    key={drive.id}
                    type="button"
                    onClick={() => {
                      setActiveDriveId(drive.id);
                      setActiveFolderId('all');
                    }}
                    className={`w-full rounded-md border p-2 text-left transition-colors ${
                      active
                        ? 'border-sky-400/60 bg-sky-500/10'
                        : `${borderCls} hover:bg-white/5`
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1 truncate">
                        <HardDrive className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {drive.letter} {drive.label}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/25">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: config.visual.accentColor }}
                      />
                    </div>
                    <div className={`mt-1 flex justify-between font-mono text-[10px] tabular-nums ${mutedCls}`}>
                      <span>{drive.filesystem.split(' ')[0]}</span>
                      <span>
                        {drive.usedGb}/{drive.totalGb} GB
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center File List (Right-click enabled!) */}
        <div className={`col-span-8 sm:col-span-4 overflow-y-auto border-r ${borderCls}`}>
          {isDragging && (
            <div className="m-2.5 rounded-md border border-dashed border-sky-400 bg-sky-500/10 p-3 text-center text-xs text-sky-300">
              Solte aqui para decodificar no PolyFS
            </div>
          )}
          {visibleFiles.length === 0 ? (
            <div className={`p-5 text-center text-xs ${mutedCls}`}>
              Esta pasta ou unidade está vazia.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {visibleFiles.map((file) => {
                const active = selectedFile?.id === file.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelectFile(file.id)}
                    onContextMenu={(e) => handleFileContextMenu(e, file)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                      active
                        ? isLight
                          ? 'bg-slate-900/10 font-medium'
                          : 'bg-white/10 font-medium'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs">{file.name}</div>
                      <div className={`mt-0.5 text-[11px] ${mutedCls}`}>
                        {file.originOs} · {file.extension}
                      </div>
                    </div>
                    <span className={`shrink-0 font-mono text-[11px] tabular-nums ${mutedCls}`}>
                      {formatBytes(file.sizeBytes)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Universal Inspector */}
        <div className="hidden sm:flex sm:col-span-5 flex-col overflow-y-auto p-4">
          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold">{selectedFile.name}</h4>
                  <div className={`mt-0.5 text-[11px] ${mutedCls}`}>
                    {selectedFile.originOs} · {formatBytes(selectedFile.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedFile.launchableAppId && !selectedFile.isTrashed && (
                    <button
                      type="button"
                      onClick={() => onLaunchApp(selectedFile.launchableAppId as DesktopAppId)}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-950"
                      style={{ backgroundColor: config.visual.accentColor }}
                    >
                      <Play className="h-3 w-3" />
                      <span>Executar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleTrashFile(selectedFile.id)}
                    title={selectedFile.isTrashed ? 'Restaurar da Lixeira' : 'Mover para Lixeira'}
                    className={`rounded-md border ${borderCls} p-1.5 hover:border-red-400/50 hover:text-red-400`}
                  >
                    {selectedFile.isTrashed ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-2 border-y ${borderCls} py-2 text-xs`}>
                <div>
                  <div className={`text-[10px] ${mutedCls}`}>Magic Bytes</div>
                  <div className="font-mono text-[11px] tabular-nums">{selectedFile.magicHex}</div>
                </div>
                <div>
                  <div className={`text-[10px] ${mutedCls}`}>Decodificador PolyFS</div>
                  <div className="truncate text-[11px] font-medium">{selectedFile.decoder}</div>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${mutedCls}`}>{selectedFile.summary}</p>

              {selectedFile.previewImageUrl && (
                <img
                  src={selectedFile.previewImageUrl}
                  alt={selectedFile.name}
                  className={`max-h-36 w-full rounded-md border ${borderCls} bg-black/30 object-contain`}
                />
              )}

              {selectedFile.previewText && (
                <pre
                  className={`overflow-x-auto rounded-md border ${borderCls} ${surfaceCls} p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap`}
                >
                  {selectedFile.previewText}
                </pre>
              )}
            </div>
          ) : (
            <div className={`flex flex-1 items-center justify-center text-xs ${mutedCls}`}>
              Selecione um arquivo ou clique com o botão direito para opções.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   2. AETHERSTORE (NATIVE & VERIFIED LEGACY APP STORE)
   ============================================================================ */
interface AppStoreProps {
  config: AetherConfig;
  installedIds: string[];
  onInstallApp: (appId: string) => void;
  onUninstallApp: (appId: string) => void;
  onLaunchApp: (appId: DesktopAppId) => void;
  isLight: boolean;
}

export const AppStoreApp: React.FC<AppStoreProps> = ({
  config,
  installedIds,
  onInstallApp,
  onUninstallApp,
  onLaunchApp,
  isLight,
}) => {
  const [category, setCategory] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/55' : 'bg-slate-950/45';

  const categories = ['Todos', 'Produtividade', 'Desenvolvimento', 'Mídia e Design', 'Sistema e Rede'];
  const filtered = APP_STORE_CATALOG.filter((app) => {
    if (category !== 'Todos' && app.category !== category) return false;
    return (
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.summary.toLowerCase().includes(search.toLowerCase())
    );
  });

  const triggerInstall = (id: string) => {
    setInstallingId(id);
    setTimeout(() => {
      onInstallApp(id);
      setInstallingId(null);
    }, 520);
  };

  return (
    <div className="flex h-full flex-col">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCls} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat ? 'text-slate-950' : `${mutedCls} hover:opacity-100`
              }`}
              style={category === cat ? { backgroundColor: config.visual.accentColor } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-48">
          <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${mutedCls}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na loja..."
            className={`w-full rounded-md border ${borderCls} ${surfaceCls} py-1 pl-8 pr-2.5 text-xs focus:border-sky-400 focus:outline-none`}
          />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-2">
        {filtered.map((app) => {
          const isInstalled = installedIds.includes(app.id);
          const isInstalling = installingId === app.id;
          return (
            <div
              key={app.id}
              className={`flex flex-col justify-between rounded-xl border ${borderCls} ${surfaceCls} p-4`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">{app.name}</h4>
                    <div className={`text-[11px] ${mutedCls}`}>
                      {app.developer} · {app.packageFormat}
                    </div>
                  </div>
                  <span className={`font-mono text-[11px] tabular-nums ${mutedCls}`}>
                    {app.sizeMb} MB
                  </span>
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${mutedCls}`}>{app.summary}</p>
                <div className={`mt-2.5 flex items-center gap-1.5 text-[11px] ${mutedCls}`}>
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">Capabilities: {app.capabilities.join(' · ')}</span>
                </div>
              </div>

              <div className={`mt-3.5 flex items-center justify-between border-t ${borderCls} pt-3`}>
                <span className={`font-mono text-[11px] tabular-nums ${mutedCls}`}>
                  RAM est.: {app.ramMb} MB
                </span>
                <div className="flex items-center gap-2">
                  {isInstalled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onUninstallApp(app.id)}
                        className="rounded-md border border-red-400/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchApp(app.id as DesktopAppId)}
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold text-slate-950"
                        style={{ backgroundColor: config.visual.accentColor }}
                      >
                        <Play className="h-3 w-3" />
                        <span>Abrir</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isInstalling}
                      onClick={() => triggerInstall(app.id)}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-60"
                      style={{ backgroundColor: config.visual.accentColor }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{isInstalling ? 'Instalando...' : 'Instalar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
   3. FULL-SYSTEM IN-OS SETTINGS APP (9 COMPLETE SECTIONS — 100% OS ACCESS)
   ============================================================================ */
interface OsSettingsProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  users: OsUserAccount[];
  activeUser: OsUserAccount;
  wifiOn: boolean;
  btOn: boolean;
  volume: number;
  brightness: number;
  onSetWifi: (v: boolean) => void;
  onSetBt: (v: boolean) => void;
  onSetVolume: (v: number) => void;
  onSetBrightness: (v: number) => void;
  onUpdateConfig: (next: AetherConfig) => void;
  onToggleWidget: (id: WidgetId) => void;
  onResizeWidget: (id: WidgetId, nextWidth: number) => void;
  onApplyLayoutPreset: (preset: MultitaskLayoutPreset) => void;
  onSwitchUser: (userId: string) => void;
  onLockScreen: () => void;
  onCreateUser: (payload: {
    displayName: string;
    username: string;
    pin: string;
    role: OsUserAccount['role'];
    presetId: string;
    avatarColor: string;
  }) => OsUserAccount;
  onExportZip: () => void;
  isLight: boolean;
}

type SettingsSectionId =
  | 'system'
  | 'appearance'
  | 'motion'
  | 'widgets'
  | 'kernel'
  | 'language'
  | 'compat'
  | 'devices'
  | 'users-iso';

export const OsSettingsApp: React.FC<OsSettingsProps> = ({
  config,
  footprint,
  users,
  activeUser,
  wifiOn,
  btOn,
  volume,
  brightness,
  onSetWifi,
  onSetBt,
  onSetVolume,
  onSetBrightness,
  onUpdateConfig,
  onToggleWidget,
  onResizeWidget,
  onApplyLayoutPreset,
  onSwitchUser,
  onLockScreen,
  onCreateUser,
  onExportZip,
  isLight,
}) => {
  const [section, setSection] = useState<SettingsSectionId>('system');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/55' : 'bg-slate-950/45';

  const slug =
    config.visual.osName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'aetheros';

  const isoBuildCmd = `docker build -f Dockerfile.iso --output type=local,dest=./out .`;

  const copyIsoCmd = async () => {
    try {
      await navigator.clipboard.writeText(isoBuildCmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      // ignore
    }
  };

  const updateBridge = (
    key: keyof AetherConfig['compat']['bridges'],
    patch: Partial<AetherConfig['compat']['bridges']['win32']>
  ) => {
    onUpdateConfig({
      ...config,
      compat: {
        ...config.compat,
        bridges: {
          ...config.compat.bridges,
          [key]: { ...config.compat.bridges[key], ...patch },
        },
      },
    });
  };

  const sections: Array<{ id: SettingsSectionId; label: string }> = [
    { id: 'system', label: 'Sistema e Boot' },
    { id: 'appearance', label: 'Aparência e Vidro' },
    { id: 'motion', label: 'Animações e Multitarefa' },
    { id: 'widgets', label: 'Widgets do Desktop' },
    { id: 'kernel', label: 'Kernel e Hardware' },
    { id: 'language', label: 'Linguagem AetherLang' },
    { id: 'compat', label: 'PolyFS e AetherVMM' },
    { id: 'devices', label: 'Rede, Áudio e Discos' },
    { id: 'users-iso', label: 'Contas e Compilar ISO' },
  ];

  return (
    <div className="grid h-full grid-cols-12">
      {/* Full System Settings Nav */}
      <div className={`col-span-4 overflow-y-auto border-r ${borderCls} p-2.5 space-y-0.5`}>
        {sections.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`w-full rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
              section === tab.id ? 'bg-sky-500/15 font-semibold' : `${mutedCls} hover:bg-white/5`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="col-span-8 overflow-y-auto p-4 space-y-4">
        {section === 'system' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Identidade do Sistema e Inicialização</h4>
              <p className={`text-xs ${mutedCls}`}>
                Configurações centrais refletidas no Bootloader, Kernel Chronos e imagem ISO.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Nome do SO</label>
                <input
                  type="text"
                  value={config.visual.osName}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, osName: e.target.value },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} ${surfaceCls} px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
                />
              </div>
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Versão</label>
                <input
                  type="text"
                  value={config.visual.osVersion}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, osVersion: e.target.value },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} ${surfaceCls} px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
                />
              </div>
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Codinome</label>
                <input
                  type="text"
                  value={config.visual.codename}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, codename: e.target.value },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} ${surfaceCls} px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
                />
              </div>
            </div>

            <div className={`space-y-2.5 rounded-lg border ${borderCls} ${surfaceCls} p-3`}>
              <label className="flex cursor-pointer items-center justify-between text-xs">
                <div>
                  <div className="font-medium">Bootloader Dual-Boot Gráfico</div>
                  <div className={`text-[11px] ${mutedCls}`}>
                    Permite escolher entre {config.visual.osName} e Windows/macOS/Linux ao ligar o PC
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.operational.dualBootEnabled}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      operational: { ...config.operational, dualBootEnabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-sky-400"
                />
              </label>

              {config.operational.dualBootEnabled && (
                <div>
                  <label className={`mb-1 block text-[11px] ${mutedCls}`}>Sistema Padrão no Boot</label>
                  <select
                    value={config.operational.dualBootDefaultOs}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        operational: {
                          ...config.operational,
                          dualBootDefaultOs: e.target.value as 'aether' | 'existing',
                        },
                      })
                    }
                    className={`w-full rounded-md border ${borderCls} bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100`}
                  >
                    <option value="aether">{config.visual.osName} (Principal)</option>
                    <option value="existing">Sistema Existente no Disco</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Aparência Liquid Glass</h4>
                <p className={`text-xs ${mutedCls}`}>
                  Vinculado ao perfil de {activeUser.displayName}.
                </p>
              </div>
              <div className="flex rounded-md bg-black/25 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, desktopTheme: 'dark' },
                    })
                  }
                  className={`rounded px-2.5 py-1 ${config.visual.desktopTheme === 'dark' ? 'bg-sky-500/25 text-white' : mutedCls}`}
                >
                  Escuro
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, desktopTheme: 'light' },
                    })
                  }
                  className={`rounded px-2.5 py-1 ${config.visual.desktopTheme === 'light' ? 'bg-sky-500/25 text-white' : mutedCls}`}
                >
                  Claro
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, wallpaperId: wp.id },
                    })
                  }
                  className={`overflow-hidden rounded-lg border text-left ${
                    config.visual.wallpaperId === wp.id ? 'border-sky-400' : borderCls
                  }`}
                >
                  <img
                    src={wp.imagePath}
                    alt={wp.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-full object-cover"
                  />
                  <div className="px-2 py-1 text-[11px] font-medium truncate">{wp.name}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Opacidade</span>
                  <span className="font-mono tabular-nums">{config.visual.glassOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={92}
                  value={config.visual.glassOpacity}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, glassOpacity: Number(e.target.value) },
                    })
                  }
                  className="aether-slider w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Desfoque (Blur)</span>
                  <span className="font-mono tabular-nums">{config.visual.glassBlurPx} px</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={32}
                  value={config.visual.glassBlurPx}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, glassBlurPx: Number(e.target.value) },
                    })
                  }
                  className="aether-slider w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Raio de Borda</span>
                  <span className="font-mono tabular-nums">{config.visual.borderRadiusPx} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={config.visual.borderRadiusPx}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      visual: { ...config.visual, borderRadiusPx: Number(e.target.value) },
                    })
                  }
                  className="aether-slider w-full"
                />
              </div>
              <div>
                <div className="mb-1 text-xs">Cor de Destaque</div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  {ACCENT_SWATCHES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          ...config,
                          visual: { ...config.visual, accentColor: s.hex },
                        })
                      }
                      className={`h-5 w-5 rounded-full border-2 ${
                        config.visual.accentColor === s.hex ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: s.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'motion' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Animações, Ergonomia e Multitarefa</h4>

            <div>
              <label className={`mb-1.5 block text-xs ${mutedCls}`}>Física das Animações do Sistema</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'fluid', label: 'Fluido (Molas)', desc: 'Dinamismo suave' },
                    { id: 'snappy', label: 'Rápido Preciso', desc: '130ms imediato' },
                    { id: 'reduced', label: 'Reduzido', desc: 'Hardware antigo' },
                  ] as Array<{ id: AnimationProfile; label: string; desc: string }>
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        ...config,
                        visual: { ...config.visual, animationProfile: mode.id },
                      })
                    }
                    className={`rounded-lg border p-2.5 text-left ${
                      config.visual.animationProfile === mode.id
                        ? 'border-sky-400 bg-sky-500/15'
                        : `${borderCls} ${surfaceCls}`
                    }`}
                  >
                    <div className="text-xs font-semibold">{mode.label}</div>
                    <div className={`text-[10px] ${mutedCls}`}>{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className={`flex cursor-pointer items-center justify-between rounded-lg border ${borderCls} ${surfaceCls} p-3 text-xs`}>
              <div>
                <div className="font-medium">Pré-visualização ao Vivo na Barra de Tarefas</div>
                <div className={`text-[11px] ${mutedCls}`}>
                  Exibe miniatura interativa e ações rápidas ao passar o mouse sobre apps abertos
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.visual.taskbarLivePreview}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    visual: { ...config.visual, taskbarLivePreview: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-sky-400"
              />
            </label>

            <div>
              <label className={`mb-1.5 block text-xs ${mutedCls}`}>Paradigma da Barra / Dock</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'classic-bottom', label: 'Barra Inferior' },
                    { id: 'spatial-dock', label: 'Dock Espacial' },
                    { id: 'hybrid-aether', label: 'Híbrido Aether' },
                  ] as Array<{ id: ErgonomicParadigm; label: string }>
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        ...config,
                        visual: { ...config.visual, paradigm: p.id },
                      })
                    }
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium ${
                      config.visual.paradigm === p.id
                        ? 'border-sky-400 bg-sky-500/15'
                        : `${borderCls} ${surfaceCls}`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={`mb-1.5 text-xs ${mutedCls}`}>
                Aplicar Organização Automática Agora (6 Formas Pré-Programadas)
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MULTITASK_LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onApplyLayoutPreset(preset.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border ${borderCls} ${surfaceCls} p-2 text-center hover:border-sky-400`}
                  >
                    <LayoutDiagramGlyph preset={preset.id} accent={config.visual.accentColor} />
                    <span className="text-[11px] font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'widgets' && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Widgets e Redimensionamento ({activeUser.displayName})</h4>
            <div className="space-y-2">
              {WIDGET_CATALOG.map((w) => {
                const enabled = activeUser.enabledWidgets.includes(w.id);
                const width = activeUser.widgetWidths?.[w.id] ?? 252;
                return (
                  <div
                    key={w.id}
                    className={`space-y-2 rounded-lg border ${borderCls} ${surfaceCls} p-3`}
                  >
                    <label className="flex cursor-pointer items-center justify-between">
                      <div>
                        <div className="text-xs font-medium">{w.name}</div>
                        <div className={`text-[11px] ${mutedCls}`}>{w.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => onToggleWidget(w.id)}
                        className="h-4 w-4 accent-sky-400"
                      />
                    </label>
                    {enabled && (
                      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px]">
                        <span className={`font-mono tabular-nums ${mutedCls}`}>Largura: {width}px</span>
                        <div className="flex gap-1">
                          {[
                            { label: 'Compacto', px: 210 },
                            { label: 'Padrão', px: 256 },
                            { label: 'Largo', px: 330 },
                          ].map((sz) => (
                            <button
                              key={sz.label}
                              type="button"
                              onClick={() => onResizeWidget(w.id, sz.px)}
                              className={`rounded border px-2 py-0.5 ${
                                Math.abs(width - sz.px) < 18
                                  ? 'border-sky-400 bg-sky-500/20'
                                  : borderCls
                              }`}
                            >
                              {sz.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === 'kernel' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Microkernel Chronos e Hardware</h4>
            <div className={`grid grid-cols-3 gap-2 rounded-lg border ${borderCls} ${surfaceCls} p-3 text-xs`}>
              <div>
                <div className={mutedCls}>RAM Base</div>
                <div className="font-mono font-semibold tabular-nums">{footprint.totalIdleRamMb} MB</div>
              </div>
              <div>
                <div className={mutedCls}>Alvo Mínimo</div>
                <div className="font-mono font-semibold tabular-nums">{config.operational.minRamMb} MB</div>
              </div>
              <div>
                <div className={mutedCls}>ISO Estimada</div>
                <div className="font-mono font-semibold tabular-nums">~{footprint.isoSizeMb} MB</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'legacy-128mb', label: 'PC Legado 128 MB', ram: 128 },
                  { id: 'balanced-1gb', label: 'Equilibrado 512 MB', ram: 512 },
                  { id: 'workstation-4gb', label: 'Estação 2 GB', ram: 2048 },
                ] as Array<{ id: HardwareProfileId; label: string; ram: number }>
              ).map((hp) => (
                <button
                  key={hp.id}
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      operational: {
                        ...config.operational,
                        hardwareProfile: hp.id,
                        minRamMb: hp.ram,
                      },
                    })
                  }
                  className={`rounded-lg border px-2.5 py-2 text-xs font-medium ${
                    config.operational.hardwareProfile === hp.id
                      ? 'border-sky-400 bg-sky-500/15'
                      : `${borderCls} ${surfaceCls}`
                  }`}
                >
                  {hp.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Escalonador Chronos</label>
                <select
                  value={config.operational.schedulerPolicy}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      operational: {
                        ...config.operational,
                        schedulerPolicy: e.target.value as SchedulerPolicy,
                      },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100`}
                >
                  <option value="chronos-deterministic">Determinístico Justo</option>
                  <option value="hybrid-cooperative">Cooperativo Híbrido</option>
                  <option value="realtime-strict">Tempo Real Estrito</option>
                </select>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className={mutedCls}>Quantum de CPU</span>
                  <span className="font-mono tabular-nums">{config.operational.cpuQuantumMs} ms</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={config.operational.cpuQuantumMs}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      operational: { ...config.operational, cpuQuantumMs: Number(e.target.value) },
                    })
                  }
                  className="aether-slider w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              {(
                [
                  { key: 'bypassTpm2', label: 'Ignorar exigência de TPM 2.0 (PCs antigos)' },
                  { key: 'bypassSecureBoot', label: 'Permitir boot sem Secure Boot' },
                  { key: 'legacyCpuFallback', label: 'Fallback para CPUs sem SSE4.2 / POPCNT' },
                  { key: 'memoryCompression', label: 'Ativar compressão de memória ZPool' },
                ] as const
              ).map((item) => (
                <label key={item.key} className="flex cursor-pointer items-center justify-between text-xs">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={config.operational[item.key]}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        operational: { ...config.operational, [item.key]: e.target.checked },
                      })
                    }
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {section === 'language' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Linguagem Nativa AetherLang e Compilador aethc</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Modelo de Segurança de Memória</label>
                <select
                  value={config.language.memoryModel}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      language: {
                        ...config.language,
                        memoryModel: e.target.value as MemorySafetyModel,
                      },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100`}
                >
                  <option value="linear-ownership">Ownership Linear (Sem GC)</option>
                  <option value="deterministic-rc">Contagem Determinística (RC)</option>
                  <option value="static-arena">Arenas Estáticas</option>
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Otimização de Compilação</label>
                <select
                  value={config.language.optimization}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      language: {
                        ...config.language,
                        optimization: e.target.value as AetherConfig['language']['optimization'],
                      },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100`}
                >
                  <option value="size-min">Tamanho Mínimo (Legado)</option>
                  <option value="balanced">Equilibrado</option>
                  <option value="max-perf">Desempenho Máximo</option>
                </select>
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between text-xs">
              <span>Verificação estrita de Capabilities em tempo de compilação</span>
              <input
                type="checkbox"
                checked={config.language.strictCapabilities}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    language: { ...config.language, strictCapabilities: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-sky-400"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between text-xs">
              <span>Emitir documentação de ABI no pacote de compilação</span>
              <input
                type="checkbox"
                checked={config.language.emitAbiDocs}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    language: { ...config.language, emitAbiDocs: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-sky-400"
              />
            </label>
          </div>
        )}

        {section === 'compat' && (
          <div className="space-y-3.5">
            <h4 className="text-sm font-semibold">PolyFS Universal e Virtualização AetherVMM</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`mb-1 block text-[11px] ${mutedCls}`}>Política de Sandbox</label>
                <select
                  value={config.compat.sandboxPolicy}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      compat: {
                        ...config.compat,
                        sandboxPolicy: e.target.value as AetherConfig['compat']['sandboxPolicy'],
                      },
                    })
                  }
                  className={`w-full rounded-md border ${borderCls} bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100`}
                >
                  <option value="strict-capability">Isolamento Estrito</option>
                  <option value="balanced-user">Equilibrado (Usuário)</option>
                  <option value="direct-inspect">Inspeção Direta</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-between pt-4 text-xs">
                <span>Decodificação Automática</span>
                <input
                  type="checkbox"
                  checked={config.compat.universalCodecAutoDecode}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      compat: { ...config.compat, universalCodecAutoDecode: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-sky-400"
                />
              </label>
            </div>

            <div className="space-y-2">
              {(
                [
                  { key: 'win32', label: 'Windows (.exe / .msi)' },
                  { key: 'android', label: 'Android (.apk / .aab)' },
                  { key: 'macos', label: 'macOS (.dmg / .pkg)' },
                  { key: 'linux', label: 'Linux (.AppImage / ELF)' },
                ] as const
              ).map((b) => {
                const cfg = config.compat.bridges[b.key];
                return (
                  <div
                    key={b.key}
                    className={`rounded-lg border ${borderCls} ${surfaceCls} p-3 space-y-2`}
                  >
                    <label className="flex cursor-pointer items-center justify-between text-xs font-medium">
                      <span>{b.label}</span>
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => updateBridge(b.key, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-sky-400"
                      />
                    </label>
                    {cfg.enabled && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono tabular-nums">Teto RAM: {cfg.maxRamMb} MB</span>
                        <input
                          type="range"
                          min={48}
                          max={1024}
                          step={32}
                          value={cfg.maxRamMb}
                          onChange={(e) => updateBridge(b.key, { maxRamMb: Number(e.target.value) })}
                          className="aether-slider w-32"
                        />
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={cfg.gpuAcceleration}
                            onChange={(e) =>
                              updateBridge(b.key, { gpuAcceleration: e.target.checked })
                            }
                            className="h-3.5 w-3.5 accent-sky-400"
                          />
                          <span>GPU</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={cfg.networkIsolated}
                            onChange={(e) =>
                              updateBridge(b.key, { networkIsolated: e.target.checked })
                            }
                            className="h-3.5 w-3.5 accent-sky-400"
                          />
                          <span>Rede Isolada</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === 'devices' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Rede, Áudio, Tela e Unidades de Armazenamento</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={`flex cursor-pointer items-center justify-between rounded-lg border ${borderCls} ${surfaceCls} p-3 text-xs`}>
                <span>Adaptador Wi-Fi (AetherNet)</span>
                <input
                  type="checkbox"
                  checked={wifiOn}
                  onChange={(e) => onSetWifi(e.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
              </label>
              <label className={`flex cursor-pointer items-center justify-between rounded-lg border ${borderCls} ${surfaceCls} p-3 text-xs`}>
                <span>Bluetooth Low-Latency</span>
                <input
                  type="checkbox"
                  checked={btOn}
                  onChange={(e) => onSetBt(e.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Volume Principal</span>
                  <span className="font-mono tabular-nums">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => onSetVolume(Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Brilho do Monitor</span>
                  <span className="font-mono tabular-nums">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={55}
                  max={115}
                  value={brightness}
                  onChange={(e) => onSetBrightness(Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-xs font-medium ${mutedCls}`}>Unidades Montadas</div>
              {STORAGE_DRIVES.map((d) => {
                const pct = Math.round((d.usedGb / d.totalGb) * 100);
                return (
                  <div
                    key={d.id}
                    className={`rounded-lg border ${borderCls} ${surfaceCls} p-3 text-xs`}
                  >
                    <div className="flex justify-between font-medium">
                      <span>
                        {d.letter} {d.label} ({d.filesystem})
                      </span>
                      <span className="font-mono tabular-nums">
                        {d.usedGb} / {d.totalGb} GB ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: config.visual.accentColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {section === 'users-iso' && (
          <div className="space-y-4">
            {/* ISO Compilation Download Assistant */}
            <div className={`rounded-xl border border-sky-400/35 bg-sky-500/10 p-4 space-y-2.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">
                    Kit Completo de Compilação da ISO Inicializável
                  </h4>
                  <p className={`text-xs ${mutedCls}`}>
                    Inclui Multiboot2 ASM, Transpilador aethc, Kernel Freestanding, Linker, GRUB e Dockerfile.iso para gerar{' '}
                    <span className="font-mono">{slug}-{config.visual.osVersion}.iso</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExportZip}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap"
                  style={{ backgroundColor: config.visual.accentColor }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar Kit ISO (.zip)</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-black/35 px-3 py-2 font-mono text-[11px]">
                <span className="truncate">{isoBuildCmd}</span>
                <button
                  type="button"
                  onClick={copyIsoCmd}
                  className="shrink-0 rounded p-1 hover:bg-white/10"
                >
                  {copiedCmd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* User Accounts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Contas e Perfis Vinculados</h4>
                <p className={`text-xs ${mutedCls}`}>
                  Cada usuário mantém suas configurações, widgets e aplicativos isolados.
                </p>
              </div>
              <button
                type="button"
                onClick={onLockScreen}
                className={`inline-flex items-center gap-1.5 rounded-md border ${borderCls} px-2.5 py-1.5 text-xs hover:border-sky-400`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Bloquear Sessão</span>
              </button>
            </div>

            <div className="space-y-2">
              {users.map((u) => {
                const isCurrent = u.id === activeUser.id;
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between rounded-lg border ${borderCls} ${surfaceCls} p-3`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.initials}
                      </span>
                      <div>
                        <div className="text-xs font-semibold">
                          {u.displayName} {isCurrent ? '(Ativo)' : ''}
                        </div>
                        <div className={`text-[11px] ${mutedCls}`}>
                          @{u.username} · {u.role} · PIN {u.pin} · {u.config.operational.minRamMb} MB
                        </div>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onSwitchUser(u.id)}
                        className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20"
                      >
                        Trocar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newUserName.trim().length < 2 || newUserPin.trim().length < 4) return;
                const username = newUserName
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '');
                onCreateUser({
                  displayName: newUserName.trim(),
                  username: username || `user${users.length + 1}`,
                  pin: newUserPin.trim(),
                  role: 'Padrão',
                  presetId: QUICK_PRESETS[0].id,
                  avatarColor: ACCENT_SWATCHES[users.length % ACCENT_SWATCHES.length].hex,
                });
                setNewUserName('');
                setNewUserPin('');
              }}
              className={`space-y-2 rounded-lg border ${borderCls} ${surfaceCls} p-3`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Criar Nova Conta</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                  className={`rounded border ${borderCls} bg-transparent px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
                />
                <input
                  type="password"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value)}
                  placeholder="PIN (4+ dígitos)"
                  className={`rounded border ${borderCls} bg-transparent px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
                />
              </div>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-950"
                style={{ backgroundColor: config.visual.accentColor }}
              >
                Criar Conta Vinculada
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   4. NATIVE UTILITY APPS: NOTES, CALC, MEDIA, BROWSER, & STORE APP RUNTIME
   ============================================================================ */
export const AetherNotesApp: React.FC<{
  config: AetherConfig;
  isLight: boolean;
  onSaveDocument: (filename: string, content: string) => void;
}> = ({ config, isLight, onSaveDocument }) => {
  const [title, setTitle] = useState('Anotacoes_Sistema.txt');
  const [body, setBody] = useState(
    `Notas do ${config.visual.osName} (${config.visual.codename})\n\n• Escalonador Chronos com quantum ${config.operational.cpuQuantumMs} ms\n• PolyFS universal ativo para todos os formatos\n• Salve este documento para enviá-lo direto à pasta /Documentos.`
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between gap-2 border-b ${borderCls} px-3.5 py-2`}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-56 bg-transparent text-xs font-semibold focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            onSaveDocument(title.trim() || 'nota.txt', body);
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 1800);
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold text-slate-950"
          style={{ backgroundColor: config.visual.accentColor }}
        >
          {savedNotice ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          <span>{savedNotice ? 'Salvo em /Documentos' : 'Salvar em /Documentos'}</span>
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        spellCheck={false}
        className="flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed focus:outline-none"
      />
    </div>
  );
};

export const AetherCalcApp: React.FC<{ config: AetherConfig; isLight: boolean }> = ({
  config,
  isLight,
}) => {
  const [expr, setExpr] = useState('128 * 1024');
  const [display, setDisplay] = useState('131072');
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';

  const evaluate = (nextExpr: string) => {
    try {
      const sanitized = nextExpr.replace(/[^0-9+\-*/().\s]/g, '');
      if (!sanitized.trim()) {
        setDisplay('0');
        return;
      }
      const val = Function(`"use strict"; return (${sanitized});`)() as number;
      if (Number.isFinite(val)) {
        setDisplay(String(Math.round(val * 10000) / 10000));
      }
    } catch {
      setDisplay('Erro');
    }
  };

  const intVal = Number.isFinite(Number(display)) ? Math.trunc(Number(display)) : 0;
  const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', 'C', '+'];

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className={`rounded-lg border ${borderCls} bg-black/25 p-3 text-right`}>
        <div className="font-mono text-xs opacity-65 tabular-nums">{expr || '0'}</div>
        <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{display}</div>
        <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-mono text-[10px] opacity-75 tabular-nums">
          <span>HEX: 0x{Math.max(0, intVal).toString(16).toUpperCase()}</span>
          <span>BIN: {Math.max(0, intVal).toString(2).slice(0, 16)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              if (k === 'C') {
                setExpr('');
                setDisplay('0');
              } else {
                setExpr(expr + k);
              }
            }}
            className={`rounded-lg border ${borderCls} py-2.5 font-mono text-sm font-medium hover:bg-white/10`}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => evaluate(expr)}
          className="col-span-4 rounded-lg py-2.5 font-mono text-sm font-semibold text-slate-950"
          style={{ backgroundColor: config.visual.accentColor }}
        >
          = Calcular
        </button>
      </div>
    </div>
  );
};

export const AetherMediaApp: React.FC<{
  polyFiles: PolyFileEntry[];
  isLight: boolean;
}> = ({ polyFiles, isLight }) => {
  const uploadedImages = polyFiles
    .filter((f) => Boolean(f.previewImageUrl))
    .map((f) => ({ id: f.id, name: f.name, src: f.previewImageUrl! }));

  const gallery = [
    ...uploadedImages,
    ...WALLPAPERS.map((w) => ({ id: w.id, name: w.name, src: w.imagePath })),
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [zoom, setZoom] = useState(100);
  const current = gallery[selectedIdx] ?? gallery[0];
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b ${borderCls} px-3.5 py-2 text-xs`}>
        <span className="font-medium truncate">{current.name}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="rounded p-1 hover:bg-white/10"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] tabular-nums">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            className="rounded p-1 hover:bg-white/10"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/30 p-3">
        <img
          src={current.src}
          alt={current.name}
          referrerPolicy="no-referrer"
          style={{ transform: `scale(${zoom / 100})` }}
          className="max-h-full max-w-full rounded-md object-contain transition-transform duration-150"
        />
      </div>

      <div className={`flex gap-2 overflow-x-auto border-t ${borderCls} p-2.5`}>
        {gallery.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedIdx(idx);
              setZoom(100);
            }}
            className={`h-11 w-16 shrink-0 overflow-hidden rounded border ${
              idx === selectedIdx ? 'border-sky-400' : borderCls
            }`}
          >
            <img
              src={item.src}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export const AetherBrowserApp: React.FC<{
  config: AetherConfig;
  footprint: SystemFootprint;
  isLight: boolean;
  onExportZip: () => void;
}> = ({ config, footprint, isLight, onExportZip }) => {
  const [url, setUrl] = useState<'aether://iso' | 'aether://inicio' | 'aether://arquitetura'>(
    'aether://iso'
  );
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const slug =
    config.visual.osName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'aetheros';

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2 border-b ${borderCls} px-3 py-2 text-xs`}>
        {(
          [
            { id: 'aether://iso', label: 'Compilar ISO Real' },
            { id: 'aether://inicio', label: 'Início' },
            { id: 'aether://arquitetura', label: 'Núcleo Chronos' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setUrl(tab.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              url === tab.id ? 'bg-sky-500/20 text-sky-300' : `${mutedCls} hover:bg-white/5`
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className={`ml-auto hidden sm:block font-mono text-[11px] ${mutedCls}`}>{url}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
        {url === 'aether://iso' && (
          <>
            <h4 className="font-display text-base font-semibold">
              Compilando a ISO Inicializável do {config.visual.osName}
            </h4>
            <p className={mutedCls}>
              O pacote ZIP baixado contém a cadeia completa bare-metal: <code className="font-mono">boot/multiboot2_entry.asm</code>, transpilador <code className="font-mono">tools/aethc_transpiler.py</code>, <code className="font-mono">kernel/chronos_entry.c</code>, <code className="font-mono">kernel/linker.ld</code>, <code className="font-mono">iso/boot/grub/grub.cfg</code> e <code className="font-mono">Dockerfile.iso</code>.
            </p>
            <pre className={`rounded-lg border ${borderCls} bg-black/35 p-3 font-mono text-[11px] overflow-x-auto`}>
{`# 1. Extrair o pacote ZIP da Workstation
unzip ${slug}-${config.visual.osVersion}-source-bundle.zip
cd ${slug}-src

# 2. Gerar a imagem .iso inicializável real em 1 comando via Docker
docker build -f Dockerfile.iso --output type=local,dest=./out .

# 3. Inicializar no QEMU (ou gravar ./out/${slug}-${config.visual.osVersion}.iso em pendrive)
qemu-system-x86_64 -m ${config.operational.minRamMb}M -cdrom ./out/${slug}-${config.visual.osVersion}.iso`}
            </pre>
            <button
              type="button"
              onClick={onExportZip}
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-slate-950"
              style={{ backgroundColor: config.visual.accentColor }}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Kit Completo da ISO (.zip)</span>
            </button>
          </>
        )}

        {url === 'aether://inicio' && (
          <>
            <h4 className="font-display text-base font-semibold">
              Bem-vindo ao {config.visual.osName} {config.visual.osVersion}
            </h4>
            <p className={mutedCls}>
              Sistema operacional independente com interface Liquid Glass, menus de contexto com botão direito, pré-visualização ao vivo na barra de tarefas, janelas e widgets redimensionáveis e 6 layouts automáticos de multitarefa.
            </p>
            <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
              <div className={`rounded-lg border ${borderCls} p-3`}>
                <div className={mutedCls}>Pegada Base</div>
                <div className="mt-1 text-sm font-semibold">{footprint.totalIdleRamMb} MB RAM</div>
              </div>
              <div className={`rounded-lg border ${borderCls} p-3`}>
                <div className={mutedCls}>Imagem ISO</div>
                <div className="mt-1 text-sm font-semibold">~{footprint.isoSizeMb} MB</div>
              </div>
            </div>
          </>
        )}

        {url === 'aether://arquitetura' && (
          <>
            <h4 className="font-display text-base font-semibold">Microkernel Chronos + AetherLang</h4>
            <p className={mutedCls}>
              Diferente de distribuições Linux ou derivados POSIX, toda chamada do sistema no {config.visual.osName} é validada estaticamente por Capabilities e enviada em anéis IPC de cópia zero. Drivers (HAL), rede (AetherNet), arquivos (PolyFS) e virtualização legada (AetherVMM) rodam isolados em espaço de usuário.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export const InstalledStoreAppWindow: React.FC<{
  appId: string;
  config: AetherConfig;
  isLight: boolean;
}> = ({ appId, config, isLight }) => {
  const entry = APP_STORE_CATALOG.find((a) => a.id === appId);
  const [playing, setPlaying] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState(
    `module user.app\n\ncapability DisplayCap { grant surface: LumenId; }\n\nfn start(borrow d: DisplayCap) -> Void {\n  lumen.render_glass(d.surface)\n}`
  );
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';

  if (!entry) return null;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b ${borderCls} px-4 py-2 text-[11px]`}>
        <span className="font-medium">
          {entry.name} · {entry.packageFormat}
        </span>
        <span className={`font-mono tabular-nums ${mutedCls}`}>
          Capabilities: {entry.capabilities.join(', ')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {appId === 'store-aethercode' && (
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center gap-1.5 font-medium">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              <span>main.aeth — Compilador aethc integrado</span>
            </div>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              spellCheck={false}
              className={`min-h-[180px] flex-1 rounded-lg border ${borderCls} bg-black/35 p-3 font-mono text-xs focus:border-sky-400 focus:outline-none`}
            />
          </div>
        )}

        {appId === 'store-sonicwave' && (
          <div className="space-y-4">
            <div className={`rounded-lg border ${borderCls} bg-black/25 p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Aurora_Ambient_24bit.flac</div>
                  <div className={mutedCls}>96 kHz · Lossless · AudioHDA Zero-Copy</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-950"
                  style={{ backgroundColor: config.visual.accentColor }}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{playing ? 'Pausar' : 'Reproduzir'}</span>
                </button>
              </div>
              <div className="mt-4 flex h-12 items-end gap-1">
                {[35, 62, 48, 84, 54, 72, 90, 42, 68, 76, 50, 88, 60, 44, 70, 56].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-200"
                    style={{
                      height: `${playing ? h : Math.round(h * 0.35)}%`,
                      backgroundColor: config.visual.accentColor,
                      opacity: playing ? 0.9 : 0.4,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {appId !== 'store-aethercode' && appId !== 'store-sonicwave' && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{entry.name}</h4>
            <p className={mutedCls}>{entry.summary}</p>
            <div className={`rounded-lg border ${borderCls} bg-black/25 p-3.5 font-mono text-[11px] space-y-1`}>
              <div>Pacote: {entry.packageFormat}</div>
              <div>Desenvolvedor: {entry.developer}</div>
              <div>Memória Alocada: {entry.ramMb} MB</div>
              <div>Isolamento: {config.compat.sandboxPolicy}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
