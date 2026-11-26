import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  Search,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  AetherConfig,
  BuildCheckItem,
  GeneratedSourceFile,
  SystemFootprint,
} from '../../types/aether';

interface BuildExplorerViewProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  files: GeneratedSourceFile[];
  checks: BuildCheckItem[];
  onExportZip: () => void;
  isExporting: boolean;
}

export const BuildExplorerView: React.FC<BuildExplorerViewProps> = ({
  config,
  footprint,
  files,
  checks,
  onExportZip,
  isExporting,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(files[0]?.path ?? 'README.md');
  const [search, setSearch] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedDockerCmd, setCopiedDockerCmd] = useState(false);

  const dockerIsoCommand = 'docker build -f Dockerfile.iso --output type=local,dest=./out .';

  const handleCopyDockerCmd = async () => {
    try {
      await navigator.clipboard.writeText(dockerIsoCommand);
      setCopiedDockerCmd(true);
      setTimeout(() => setCopiedDockerCmd(false), 1800);
    } catch {
      // Fallback silent
    }
  };

  const filteredFiles = useMemo(
    () =>
      files.filter(
        (f) =>
          f.path.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase())
      ),
    [files, search]
  );

  const activeFile =
    files.find((f) => f.path === selectedPath) ?? filteredFiles[0] ?? files[0];

  const groupedFolders = useMemo(() => {
    const map = new Map<string, GeneratedSourceFile[]>();
    for (const file of filteredFiles) {
      const list = map.get(file.folder) ?? [];
      list.push(file);
      map.set(file.folder, list);
    }
    return Array.from(map.entries());
  }, [filteredFiles]);

  const totalBytes = useMemo(
    () => files.reduce((acc, f) => acc + new Blob([f.content]).size, 0),
    [files]
  );

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // Fallback silent
    }
  };

  const lines = activeFile ? activeFile.content.split('\n') : [];
  const hasErrors = checks.some((c) => c.status === 'error');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0B0F17]">
      {/* Build Header & Integrity Checks Summary */}
      <div className="border-b border-white/10 bg-[#0E1420] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-semibold text-white">
              Arquivos de Compilação — {config.visual.osName} {config.visual.osVersion}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span>{files.length} arquivos gerados em tempo real</span>
              <span aria-hidden="true">·</span>
              <span>{(totalBytes / 1024).toFixed(1)} KB de código-fonte</span>
              <span aria-hidden="true">·</span>
              <span>Imagem ISO estimada ~{footprint.isoSizeMb} MB</span>
              <span aria-hidden="true">·</span>
              <span className={hasErrors ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                {hasErrors ? 'Atenção: Ajuste de RAM necessário' : 'Pronto para compilação'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={onExportZip}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-300 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Empacotando ISO...' : 'Baixar Kit Completo da ISO (.zip)'}</span>
          </button>
        </div>

        {/* Bootable ISO Compilation Kit Assistant */}
        <div className="mt-3.5 flex flex-col gap-2.5 rounded-lg border border-sky-400/25 bg-[#111827] px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Terminal className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span>Compilação Real de ISO Inicializável (Bootloader Multiboot2 + GRUB + Kernel Chronos)</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Extraia o ZIP e execute o comando abaixo com Docker para gerar a imagem{' '}
              <span className="font-mono text-slate-200">out/{config.visual.osName.toLowerCase().replace(/[^a-z0-9]/g, '')}.iso</span>{' '}
              pronta para QEMU, VirtualBox ou pendrive USB (Rufus/Ventoy).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <code className="rounded border border-white/10 bg-[#080C14] px-2.5 py-1.5 font-mono text-[11px] text-sky-300">
              {dockerIsoCommand}
            </code>
            <button
              type="button"
              onClick={handleCopyDockerCmd}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 hover:border-sky-400/50 hover:text-white"
            >
              {copiedDockerCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedDockerCmd ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPath('COMPILAR_ISO.md')}
              className="rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
            >
              Guia ISO
            </button>
            <button
              type="button"
              onClick={() => setSelectedPath('Dockerfile.iso')}
              className="rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
            >
              Dockerfile.iso
            </button>
          </div>
        </div>

        {/* Compact Validation Strip */}
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          {checks.map((check) => (
            <div
              key={check.id}
              title={check.detail}
              className="flex items-start gap-2 rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-xs"
            >
              {check.status === 'nominal' && (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              )}
              {check.status === 'warning' && (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              )}
              {check.status === 'error' && (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              )}
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-200">{check.title}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: File Tree + Code Viewer */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
        {/* Generated File Tree */}
        <div className="flex flex-col border-b border-white/10 bg-[#111827]/70 lg:col-span-4 lg:border-b-0 lg:border-r xl:col-span-3">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar arquivos gerados..."
                className="w-full rounded-md border border-white/10 bg-[#0B0F17] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
            {groupedFolders.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhum arquivo corresponde à busca.
              </div>
            ) : (
              groupedFolders.map(([folder, folderFiles]) => (
                <div key={folder}>
                  <div className="px-2 pb-1 text-[11px] font-semibold text-slate-400">
                    {folder === 'raiz' ? 'Raiz do Projeto' : `${folder}/`}
                  </div>
                  <div className="space-y-0.5">
                    {folderFiles.map((file) => {
                      const active = activeFile?.path === file.path;
                      const shortName = file.path.includes('/')
                        ? file.path.split('/').slice(1).join('/')
                        : file.path;
                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedPath(file.path)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            active
                              ? 'bg-sky-500/15 font-medium text-white'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <FileCode2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate font-mono text-[11px]">{shortName}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
                            {file.content.split('\n').length}L
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="flex min-h-0 flex-col bg-[#080C14] lg:col-span-8 xl:col-span-9">
          {activeFile && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0E1420] px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-medium text-white">
                    {activeFile.path}
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {activeFile.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:border-white/25 hover:text-white whitespace-nowrap shrink-0"
                >
                  {copiedPath === activeFile.path ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Arquivo</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-6">
                <table className="w-full border-collapse">
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="hover:bg-white/[0.025]">
                        <td className="w-10 select-none pr-4 text-right text-[11px] text-slate-600 tabular-nums align-top">
                          {index + 1}
                        </td>
                        <td className="whitespace-pre text-slate-200">{line || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
