import React, { useRef, useState } from 'react';
import {
  FileCode2,
  FileText,
  FolderOpen,
  Play,
  Plus,
  Search,
  Terminal as TerminalIcon,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  AetherConfig,
  DesktopAppId,
  DesktopWindowState,
  PolyFileEntry,
  SystemFootprint,
} from '../../types/aether';
import { LEGACY_APPS } from '../../data/presets';
import { runAetherShellCommand } from '../../engine/aetherLangAnalyzer';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function classifyUploadedFile(file: File, magicHex: string): {
  originOs: string;
  platform: PolyFileEntry['platform'];
  category: PolyFileEntry['category'];
  decoder: string;
  launchableAppId?: string;
} {
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? `.${name.split('.').pop()}` : '(sem extensão)';

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
  if (file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.heic', '.psd'].includes(ext)) {
    return {
      originOs: 'Multi-SO (Imagem)',
      platform: 'aether',
      category: 'media',
      decoder: 'PolyFS.MediaCodec Hardware Decoder',
    };
  }
  if (['.zip', '.7z', '.rar', '.tar', '.gz', '.iso'].includes(ext)) {
    return {
      originOs: 'Multi-SO (Arquivo)',
      platform: 'aether',
      category: 'archive',
      decoder: 'PolyFS.VirtualMount Transparent Reader',
    };
  }
  return {
    originOs: 'Universal',
    platform: 'aether',
    category: 'document',
    decoder: `PolyFS.UniversalStream (${ext})`,
  };
}

interface PolyFsAppProps {
  config: AetherConfig;
  files: PolyFileEntry[];
  selectedFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (entry: PolyFileEntry) => void;
  onLaunchApp: (appId: DesktopAppId) => void;
  isLight: boolean;
}

export const PolyFsApp: React.FC<PolyFsAppProps> = ({
  config,
  files,
  selectedFileId,
  onSelectFile,
  onAddFile,
  onLaunchApp,
  isLight,
}) => {
  const [query, setQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFile = files.find((f) => f.id === selectedFileId) ?? files[0];
  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.originOs.toLowerCase().includes(query.toLowerCase()) ||
      f.extension.toLowerCase().includes(query.toLowerCase())
  );

  const ingestBrowserFile = (file: File) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : 'bin';
    const headerSlice = file.slice(0, 16);
    const reader = new FileReader();

    reader.onload = () => {
      const buf = new Uint8Array(reader.result as ArrayBuffer);
      const hex = Array.from(buf.slice(0, 8))
        .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');
      const info = classifyUploadedFile(file, hex);

      const finalize = (previewText?: string, previewImageUrl?: string) => {
        const entry: PolyFileEntry = {
          id: `user-${Date.now()}`,
          name: file.name,
          extension: ext,
          originOs: info.originOs,
          platform: info.platform,
          category: info.category,
          sizeBytes: file.size,
          magicHex: hex || '00 00 00 00',
          decoder: info.decoder,
          summary: `Arquivo local inspecionado pelo PolyFS (${file.type || 'binário genérico'}) sob política ${config.compat.sandboxPolicy}.`,
          previewText,
          previewImageUrl,
          isUserUploaded: true,
          launchableAppId: info.launchableAppId,
        };
        onAddFile(entry);
        onSelectFile(entry.id);
      };

      if (file.type.startsWith('image/')) {
        const imgUrl = URL.createObjectURL(file);
        finalize(`Imagem decodificada diretamente em memória.\nMIME: ${file.type}\nTamanho: ${formatBytes(file.size)}`, imgUrl);
      } else if (
        file.type.startsWith('text/') ||
        ['.json', '.md', '.txt', '.js', '.ts', '.tsx', '.py', '.c', '.rs', '.aeth', '.toml', '.xml', '.csv', '.html', '.css'].includes(
          ext.toLowerCase()
        )
      ) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const content = String(textReader.result ?? '').slice(0, 1800);
          finalize(content || '(Arquivo de texto vazio)');
        };
        textReader.readAsText(file.slice(0, 4096));
      } else {
        const dump = Array.from(buf)
          .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(' ');
        finalize(
          `Cabeçalho binário inspecionado (primeiros ${buf.length} bytes):\n${dump}\n\nRota designada: ${info.decoder}\nEstado: Pronto para leitura segura em sandbox.`
        );
      }
    };

    reader.readAsArrayBuffer(headerSlice);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestBrowserFile(file);
  };

  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/55' : 'bg-slate-950/45';

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Top Toolbar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCls} px-3.5 py-2.5`}>
        <div className="relative flex-1 min-w-[160px]">
          <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${mutedCls}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar extensão (.exe, .apk, .dmg, .psd)..."
            className={`w-full rounded-md border ${borderCls} ${surfaceCls} py-1.5 pl-8 pr-3 text-xs focus:border-sky-400 focus:outline-none`}
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950 transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          style={{ backgroundColor: config.visual.accentColor }}
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Abrir Arquivo Local</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ingestBrowserFile(f);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Main Split */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-12">
        {/* File list */}
        <div className={`overflow-y-auto border-b md:col-span-5 md:border-b-0 md:border-r ${borderCls}`}>
          {isDragging && (
            <div className="m-2.5 rounded-md border border-dashed border-sky-400 bg-sky-500/10 p-3 text-center text-xs text-sky-300">
              Solte qualquer arquivo aqui para inspecionar no PolyFS
            </div>
          )}
          {filteredFiles.length === 0 ? (
            <div className={`p-5 text-center text-xs ${mutedCls}`}>
              Nenhum arquivo corresponde ao filtro atual.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredFiles.map((file) => {
                const active = selectedFile?.id === file.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onSelectFile(file.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors ${
                      active
                        ? isLight
                          ? 'bg-slate-900/10 font-medium'
                          : 'bg-white/10 font-medium'
                        : isLight
                          ? 'hover:bg-slate-900/5'
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

        {/* Inspector */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-4 md:col-span-7">
          {selectedFile ? (
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold">{selectedFile.name}</h4>
                  <div className={`mt-0.5 text-xs ${mutedCls}`}>
                    {selectedFile.originOs} · {formatBytes(selectedFile.sizeBytes)} ·{' '}
                    {selectedFile.isUserUploaded ? 'Arquivo Local Real' : 'Amostra Multi-SO'}
                  </div>
                </div>
                {selectedFile.launchableAppId && (
                  <button
                    type="button"
                    onClick={() => onLaunchApp(selectedFile.launchableAppId as DesktopAppId)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950 whitespace-nowrap shrink-0"
                    style={{ backgroundColor: config.visual.accentColor }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Executar no VMM</span>
                  </button>
                )}
              </div>

              <div className={`grid grid-cols-2 gap-2 border-y ${borderCls} py-2.5 text-xs`}>
                <div>
                  <div className={`text-[11px] ${mutedCls}`}>Magic Bytes (Hex)</div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums">{selectedFile.magicHex}</div>
                </div>
                <div>
                  <div className={`text-[11px] ${mutedCls}`}>Rota PolyFS</div>
                  <div className="mt-0.5 truncate text-[11px] font-medium">{selectedFile.decoder}</div>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${mutedCls}`}>{selectedFile.summary}</p>

              {selectedFile.previewImageUrl && (
                <div className={`overflow-hidden rounded-md border ${borderCls}`}>
                  <img
                    src={selectedFile.previewImageUrl}
                    alt={selectedFile.name}
                    className="max-h-40 w-full object-contain bg-black/30"
                  />
                </div>
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
            <div className={`flex flex-1 flex-col items-center justify-center text-xs ${mutedCls}`}>
              <FolderOpen className="mb-2 h-6 w-6 opacity-60" />
              <span>Selecione ou arraste qualquer arquivo para decodificar.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AetherVmmAppProps {
  config: AetherConfig;
  openWindowIds: DesktopAppId[];
  onLaunchLegacy: (id: DesktopAppId) => void;
  isLight: boolean;
}

export const AetherVmmApp: React.FC<AetherVmmAppProps> = ({
  config,
  openWindowIds,
  onLaunchLegacy,
  isLight,
}) => {
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/50' : 'bg-slate-950/45';

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Virtualizador Nativo AetherVMM</h4>
          <p className={`text-xs ${mutedCls}`}>
            Execute aplicativos Windows, Android, macOS e Linux sem kernel externo, via tradução de syscalls para Chronos Capabilities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEGACY_APPS.map((app) => {
          const bridgeCfg = config.compat.bridges[app.platform];
          const isRunning = openWindowIds.includes(app.id as DesktopAppId);

          return (
            <div
              key={app.id}
              className={`flex flex-col justify-between rounded-lg border ${borderCls} ${surfaceCls} p-3.5`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{app.name}</span>
                  <span className={`font-mono text-[11px] tabular-nums ${mutedCls}`}>
                    {app.binaryName}
                  </span>
                </div>
                <div className={`mt-1 text-[11px] ${mutedCls}`}>
                  {app.platformLabel} · Teto {bridgeCfg.maxRamMb} MB ·{' '}
                  {bridgeCfg.enabled ? 'Ponte Ativa' : 'Ponte Desativada'}
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${mutedCls}`}>{app.description}</p>
              </div>

              <div className={`mt-3 flex items-center justify-between border-t ${borderCls} pt-2.5`}>
                <span className="font-mono text-[11px] tabular-nums opacity-80">
                  ~{app.baseRamMb} MB RAM
                </span>
                <button
                  type="button"
                  disabled={!bridgeCfg.enabled}
                  onClick={() => onLaunchLegacy(app.id as DesktopAppId)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-opacity ${
                    bridgeCfg.enabled
                      ? 'text-slate-950 hover:opacity-90'
                      : 'cursor-not-allowed bg-slate-700/40 text-slate-400'
                  }`}
                  style={
                    bridgeCfg.enabled ? { backgroundColor: config.visual.accentColor } : undefined
                  }
                >
                  <Play className="h-3 w-3" />
                  <span>{isRunning ? 'Focar Janela' : 'Executar App'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TaskManagerAppProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  windows: DesktopWindowState[];
  onKillWindow: (id: DesktopAppId) => void;
  isLight: boolean;
}

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({
  config,
  footprint,
  windows,
  onKillWindow,
  isLight,
}) => {
  const [search, setSearch] = useState('');
  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';

  const activeUserProcesses = windows.filter((w) => w.isOpen);
  const appsRamMb = activeUserProcesses.reduce((sum, w) => sum + w.ramMb, 0);
  const totalUsedRamMb = footprint.totalIdleRamMb + appsRamMb;
  const ramPct = Math.min(100, Math.round((totalUsedRamMb / config.operational.minRamMb) * 100));

  const systemRows = [
    {
      pid: 1,
      name: 'chronos.microkernel',
      layer: 'Núcleo Nativo',
      ramMb: footprint.kernelRamMb,
      cpuPct: 0.4,
      killable: false,
    },
    {
      pid: 14,
      name: 'lumen.compositor',
      layer: 'Liquid Glass WM',
      ramMb: footprint.compositorRamMb,
      cpuPct: config.visual.glassBlurPx > 16 ? 2.1 : 1.1,
      killable: false,
    },
    {
      pid: 28,
      name: 'polyfs.universal_daemon',
      layer: 'Motor de Arquivos',
      ramMb: footprint.polyfsRamMb,
      cpuPct: 0.3,
      killable: false,
    },
  ];

  const allRows = [
    ...systemRows,
    ...activeUserProcesses.map((w) => ({
      pid: w.pid,
      name: w.title,
      layer: w.platform === 'aether' ? 'Nativo AetherLang' : `AetherVMM (${w.platform.toUpperCase()})`,
      ramMb: w.ramMb,
      cpuPct: w.cpuPct,
      killable: w.id !== 'taskmanager',
      windowId: w.id,
    })),
  ].filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.layer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      {/* Summary Header */}
      <div className={`grid grid-cols-3 gap-3 border-b ${borderCls} px-4 py-3 text-xs`}>
        <div>
          <div className={`text-[11px] ${mutedCls}`}>Memória em Uso</div>
          <div className="mt-0.5 font-mono font-semibold tabular-nums">
            {totalUsedRamMb} / {config.operational.minRamMb} MB ({ramPct}%)
          </div>
        </div>
        <div>
          <div className={`text-[11px] ${mutedCls}`}>Escalonador Chronos</div>
          <div className="mt-0.5 font-mono font-semibold tabular-nums">
            Quantum {config.operational.cpuQuantumMs} ms
          </div>
        </div>
        <div>
          <div className={`text-[11px] ${mutedCls}`}>Processos Ativos</div>
          <div className="mt-0.5 font-mono font-semibold tabular-nums">
            {systemRows.length + activeUserProcesses.length} tarefas
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`flex items-center justify-between gap-2 border-b ${borderCls} px-4 py-2`}>
        <div className="relative flex-1">
          <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${mutedCls}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar processos..."
            className={`w-full rounded-md border ${borderCls} bg-transparent py-1 pl-8 pr-2.5 text-xs focus:border-sky-400 focus:outline-none`}
          />
        </div>
        <span className={`font-mono text-[11px] ${mutedCls}`}>Atalho: Ctrl + Shift + Esc</span>
      </div>

      {/* Process Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className={`sticky top-0 border-b ${borderCls} ${isLight ? 'bg-slate-100/90' : 'bg-slate-900/90'}`}>
            <tr className={`text-[11px] ${mutedCls}`}>
              <th className="px-4 py-2 font-medium">PID</th>
              <th className="px-2 py-2 font-medium">Processo</th>
              <th className="px-2 py-2 font-medium">Camada</th>
              <th className="px-2 py-2 text-right font-medium">CPU</th>
              <th className="px-2 py-2 text-right font-medium">RAM</th>
              <th className="px-4 py-2 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allRows.map((row) => (
              <tr key={row.pid} className={isLight ? 'hover:bg-slate-900/5' : 'hover:bg-white/5'}>
                <td className={`px-4 py-2 font-mono text-[11px] tabular-nums ${mutedCls}`}>
                  {row.pid}
                </td>
                <td className="px-2 py-2 font-medium">{row.name}</td>
                <td className={`px-2 py-2 text-[11px] ${mutedCls}`}>{row.layer}</td>
                <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">
                  {row.cpuPct.toFixed(1)}%
                </td>
                <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums">
                  {row.ramMb} MB
                </td>
                <td className="px-4 py-2 text-right">
                  {row.killable && 'windowId' in row ? (
                    <button
                      type="button"
                      onClick={() => onKillWindow(row.windowId as DesktopAppId)}
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-500/15"
                    >
                      <XCircle className="h-3 w-3" />
                      <span>Encerrar</span>
                    </button>
                  ) : (
                    <span className={`text-[11px] ${mutedCls}`}>Sistema</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface TerminalAppProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  activeAppCount: number;
}

export const AetherShellApp: React.FC<TerminalAppProps> = ({
  config,
  footprint,
  activeAppCount,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ cmd?: string; lines: string[] }>>([
    {
      lines: [
        `${config.visual.osName} ${config.visual.osVersion} — Console Nativo AetherShell`,
        'Sintaxe própria orientada a objetos de sistema. Digite "help" para explorar.',
      ],
    },
  ]);

  const execute = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }
    const output = runAetherShellCommand(trimmed, config, footprint, activeAppCount);
    setHistory((prev) => [...prev, { cmd: trimmed, lines: output }]);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-[#070B12]/90 font-mono text-xs text-slate-200">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <TerminalIcon className="h-3.5 w-3.5 text-sky-400" />
        {['sys.info', 'mem.map', 'vmm.list', 'poly.codecs', 'boot.dual', 'aethc.check'].map(
          (quickCmd) => (
            <button
              key={quickCmd}
              type="button"
              onClick={() => execute(quickCmd)}
              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-400/50 hover:text-white"
            >
              {quickCmd}
            </button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {history.map((entry, idx) => (
          <div key={idx} className="space-y-0.5">
            {entry.cmd && (
              <div className="text-sky-400">
                <span className="text-slate-500">aether@chronos &gt; </span>
                {entry.cmd}
              </div>
            )}
            {entry.lines.map((line, lIdx) => (
              <div key={lIdx} className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute(input);
        }}
        className="flex items-center gap-2 border-t border-white/10 px-3.5 py-2.5"
      >
        <span className="text-sky-400 shrink-0">aether &gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite um comando nativo (ex: sys.info)..."
          className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </form>
    </div>
  );
};

interface LegacyAppWindowProps {
  appId: 'legacy-win32' | 'legacy-android' | 'legacy-macos' | 'legacy-linux';
  config: AetherConfig;
  isLight: boolean;
}

export const LegacyAppWindowContent: React.FC<LegacyAppWindowProps> = ({
  appId,
  config,
  isLight,
}) => {
  const template = LEGACY_APPS.find((a) => a.id === appId) ?? LEGACY_APPS[0];
  const bridgeCfg = config.compat.bridges[template.platform];
  const [notes, setNotes] = useState<string[]>([
    'Compatibilidade Win32/Android/macOS/Linux validada no mesmo desktop',
    'Sem dependência de TPM 2.0 ou Secure Boot no bootloader',
  ]);
  const [draftNote, setDraftNote] = useState('');
  const [cadLayerGrid, setCadLayerGrid] = useState(true);
  const [vectorZoom, setVectorZoom] = useState(100);

  const borderCls = isLight ? 'border-slate-900/12' : 'border-white/10';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400';
  const surfaceCls = isLight ? 'bg-white/55' : 'bg-slate-950/50';

  return (
    <div className="flex h-full flex-col">
      {/* Authentic AetherVMM Syscall Bridge Strip */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${borderCls} px-3.5 py-2 text-[11px]`}>
        <span className="font-medium">
          {template.abiBridge} · {template.platformLabel}
        </span>
        <span className={`font-mono tabular-nums ${mutedCls}`}>
          Teto {bridgeCfg.maxRamMb} MB · GPU {bridgeCfg.gpuAcceleration ? 'Ativa' : 'Software'} · Rede{' '}
          {bridgeCfg.networkIsolated ? 'Isolada' : 'Compartilhada'}
        </span>
      </div>

      {/* App Interactive Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {appId === 'legacy-win32' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Planta Técnica — Chassi ATX Legado</span>
              <button
                type="button"
                onClick={() => setCadLayerGrid((g) => !g)}
                className={`rounded border ${borderCls} px-2.5 py-1 text-[11px] hover:border-sky-400`}
              >
                {cadLayerGrid ? 'Ocultar Grade CAD' : 'Exibir Grade CAD'}
              </button>
            </div>
            <div
              className={`relative flex h-36 items-center justify-center rounded-md border ${borderCls} ${surfaceCls}`}
              style={
                cadLayerGrid
                  ? {
                      backgroundImage:
                        'linear-gradient(to right, rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.12) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }
                  : undefined
              }
            >
              <div className="h-20 w-44 rounded border-2 border-sky-400/80 bg-sky-500/10 p-2 font-mono text-[10px]">
                <div>DIM: 305mm × 244mm</div>
                <div className="mt-1 opacity-75">GDI → Lumen Surface OK</div>
              </div>
            </div>
          </div>
        )}

        {appId === 'legacy-android' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold">PulseNotes (Container Android ART)</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draftNote.trim()) return;
                setNotes((prev) => [draftNote.trim(), ...prev]);
                setDraftNote('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Adicionar nota rápida..."
                className={`flex-1 rounded-md border ${borderCls} ${surfaceCls} px-2.5 py-1.5 text-xs focus:border-sky-400 focus:outline-none`}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950"
                style={{ backgroundColor: config.visual.accentColor }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Criar</span>
              </button>
            </form>
            <div className="space-y-1.5">
              {notes.map((n, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md border ${borderCls} ${surfaceCls} px-3 py-2 text-xs`}
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {appId === 'legacy-macos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">StudioVector — Artboard Mach-O/Cocoa</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVectorZoom((z) => Math.max(50, z - 25))}
                  className={`rounded border ${borderCls} px-2 py-0.5 text-xs`}
                >
                  -
                </button>
                <span className="font-mono text-xs tabular-nums">{vectorZoom}%</span>
                <button
                  type="button"
                  onClick={() => setVectorZoom((z) => Math.min(200, z + 25))}
                  className={`rounded border ${borderCls} px-2 py-0.5 text-xs`}
                >
                  +
                </button>
              </div>
            </div>
            <div className={`flex h-36 items-center justify-center rounded-md border ${borderCls} ${surfaceCls} overflow-hidden`}>
              <div
                className="rounded-xl border border-white/25 p-5 transition-transform duration-150"
                style={{
                  transform: `scale(${vectorZoom / 100})`,
                  background: `linear-gradient(135deg, ${config.visual.accentColor}33, transparent)`,
                }}
              >
                <div className="font-display text-sm font-semibold">Lumen Glass Vector</div>
                <div className={`text-[11px] ${mutedCls}`}>Metal API → GPUCap</div>
              </div>
            </div>
          </div>
        )}

        {appId === 'legacy-linux' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <FileCode2 className="h-4 w-4 text-sky-400" />
              <span>DevForge IDE (ELF64 AppImage Sandbox)</span>
            </div>
            <pre className={`rounded-md border ${borderCls} ${surfaceCls} p-3 font-mono text-[11px] leading-relaxed`}>
{`$ ./DevForge-x86.AppImage --check-bridge
[AetherVMM.ElfBridge] Interceptando syscalls Linux x86_64
[PolyFS] /home/user mapeado com permissão Capability.ReadWrite
[LumenWM] Superfície Wayland promovida para Liquid Glass
Status: Executando nativamente sem daemon Docker ou VM pesada.`}
            </pre>
          </div>
        )}

        {/* Live Syscall Translation Trace */}
        <div className={`border-t ${borderCls} pt-3`}>
          <div className={`mb-2 text-[11px] font-medium ${mutedCls}`}>
            Tradução de Syscalls em Tempo Real ({template.abiBridge})
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            {template.syscallSamples.map((s, idx) => (
              <div
                key={idx}
                className={`flex flex-wrap items-center justify-between gap-2 rounded border ${borderCls} ${surfaceCls} px-2.5 py-1.5`}
              >
                <span className="truncate opacity-80">{s.legacy}</span>
                <span className="text-sky-400">→ {s.aether}</span>
                <span className={`tabular-nums ${mutedCls}`}>{s.latencyUs} µs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
