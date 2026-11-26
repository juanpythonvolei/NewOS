import React, { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { AetherConfig, DesktopAppId } from '../../types/aether';
import { UNIVERSAL_FORMAT_CATALOG } from '../../data/presets';

interface CompatMatrixViewProps {
  config: AetherConfig;
  onChangeConfig: (next: AetherConfig) => void;
  onOpenSampleInDesktop: (sampleFileId: string) => void;
  onLaunchLegacyInDesktop: (appId: DesktopAppId) => void;
}

export const CompatMatrixView: React.FC<CompatMatrixViewProps> = ({
  config,
  onChangeConfig,
  onOpenSampleInDesktop,
  onLaunchLegacyInDesktop,
}) => {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');

  const filteredFormats = UNIVERSAL_FORMAT_CATALOG.filter((item) => {
    const matchesSearch =
      item.ext.toLowerCase().includes(search.toLowerCase()) ||
      item.origin.toLowerCase().includes(search.toLowerCase()) ||
      item.handler.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    if (originFilter === 'all') return matchesSearch;
    return matchesSearch && item.origin.toLowerCase().includes(originFilter);
  });

  const toggleBridge = (key: keyof AetherConfig['compat']['bridges']) => {
    const current = config.compat.bridges[key];
    onChangeConfig({
      ...config,
      compat: {
        ...config.compat,
        bridges: {
          ...config.compat.bridges,
          [key]: { ...current, enabled: !current.enabled },
        },
      },
    });
  };

  const bridgeCards: Array<{
    key: keyof AetherConfig['compat']['bridges'];
    title: string;
    exts: string;
    abi: string;
    appId: DesktopAppId;
    detail: string;
  }> = [
    {
      key: 'win32',
      title: 'Windows Desktop',
      exts: '.exe · .msi · .dll',
      abi: 'PE32+ / Win32 → Chronos CapABI',
      appId: 'legacy-win32',
      detail: 'Intercepta chamadas NT/User32/GDI e promove janelas diretamente ao compositor Liquid Glass.',
    },
    {
      key: 'android',
      title: 'Android Mobile',
      exts: '.apk · .aab · .dex',
      abi: 'ART / Binder → IPC Zero-Copy',
      appId: 'legacy-android',
      detail: 'Traduz transações Binder e SurfaceFlinger para janelas móveis leves sem emulador pesado.',
    },
    {
      key: 'macos',
      title: 'macOS / Darwin',
      exts: '.dmg · .pkg · Mach-O',
      abi: 'Mach / Cocoa → LumenWM',
      appId: 'legacy-macos',
      detail: 'Monta imagens UDIF/APFS em modo somente-leitura e mapeia primitivas Cocoa/Metal para GPUCap.',
    },
    {
      key: 'linux',
      title: 'Linux / POSIX',
      exts: '.AppImage · .deb · .rpm · ELF',
      abi: 'ELF64 Syscalls → PolyFS + Chronos',
      appId: 'legacy-linux',
      detail: 'Executa binários ELF em sandbox de capabilities isoladas sem carregar kernel Linux.',
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0B0F17] p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-white/10 pb-5">
          <h1 className="font-display text-xl font-semibold text-white">
            PolyFS Universal e Virtualização AetherVMM
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Enquanto o núcleo do {config.visual.osName} permanece 100% original, a camada periférica{' '}
            <strong className="font-medium text-slate-200">PolyFS</strong> decodifica qualquer extensão
            de arquivo e o hypervisor leve{' '}
            <strong className="font-medium text-slate-200">AetherVMM</strong> traduz chamadas de
            aplicativos legados em tempo real.
          </p>
        </div>

        {/* 4 Legacy Virtualization Bridge Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {bridgeCards.map((card) => {
            const bridge = config.compat.bridges[card.key];
            return (
              <div
                key={card.key}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#111827] p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">{card.title}</h2>
                      <div className="mt-0.5 font-mono text-xs text-slate-400">{card.exts}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBridge(card.key)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        bridge.enabled
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/15 bg-white/5 text-slate-400'
                      }`}
                    >
                      {bridge.enabled ? 'Ponte Ativa' : 'Desativada'}
                    </button>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{card.detail}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {card.abi} · Teto {bridge.maxRamMb} MB
                  </span>
                  <button
                    type="button"
                    disabled={!bridge.enabled}
                    onClick={() => onLaunchLegacyInDesktop(card.appId)}
                    className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${
                      bridge.enabled
                        ? 'text-sky-400 hover:text-sky-300'
                        : 'cursor-not-allowed text-slate-600'
                    }`}
                  >
                    <span>Testar no Desktop</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Universal File Extensions Registry */}
        <div className="rounded-lg border border-white/10 bg-[#111827]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Catálogo Universal de Extensões (PolyFS)
              </h2>
              <p className="text-xs text-slate-400">
                Política ativa: <span className="font-mono text-slate-200">{config.compat.sandboxPolicy}</span> ·
                Decodificação automática:{' '}
                <span className="text-slate-200">
                  {config.compat.universalCodecAutoDecode ? 'Ativada' : 'Manual'}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar extensão ou SO..."
                  className="rounded-md border border-white/10 bg-[#0B0F17] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[#0B0F17] p-0.5 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'windows', label: 'Windows' },
                  { id: 'macos', label: 'macOS' },
                  { id: 'android', label: 'Android' },
                  { id: 'linux', label: 'Linux' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOriginFilter(f.id)}
                    className={`rounded px-2.5 py-1 whitespace-nowrap transition-colors ${
                      originFilter === f.id
                        ? 'bg-[#1E293B] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Extensões</th>
                  <th className="px-3 py-2.5 font-medium">SO de Origem</th>
                  <th className="px-3 py-2.5 font-medium">Magic Bytes</th>
                  <th className="px-3 py-2.5 font-medium">Decodificador / Ponte</th>
                  <th className="px-3 py-2.5 font-medium">Modo de Abertura</th>
                  <th className="px-4 py-2.5 text-right font-medium">Teste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFormats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhum formato encontrado para &quot;{search}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredFormats.map((item) => (
                    <tr key={item.ext} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono font-medium text-sky-400 whitespace-nowrap">
                        {item.ext}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">{item.origin}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                        {item.magic}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-300">
                        {item.handler}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{item.mode}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {item.sampleId ? (
                          <button
                            type="button"
                            onClick={() => onOpenSampleInDesktop(item.sampleId!)}
                            className="text-sky-400 hover:text-sky-300 font-medium"
                          >
                            Inspecionar
                          </button>
                        ) : (
                          <span className="text-slate-500">Via Upload</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
