import React, { useRef, useState } from 'react';
import {
  Cpu,
  Download,
  Layers,
  Palette,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import {
  AetherConfig,
  ErgonomicParadigm,
  HardwareProfileId,
  MemorySafetyModel,
  SavedProfile,
  SchedulerPolicy,
  SystemFootprint,
} from '../types/aether';
import { ACCENT_SWATCHES, QUICK_PRESETS, WALLPAPERS } from '../data/presets';

interface MetricsSidebarProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  savedProfiles: SavedProfile[];
  onChange: (next: AetherConfig) => void;
  onReset: () => void;
  onSaveProfile: (name: string) => void;
  onLoadProfile: (profile: SavedProfile) => void;
  onImportJson: (cfg: AetherConfig) => void;
}

type SidebarTab = 'visual' | 'kernel' | 'compat';

export const MetricsSidebar: React.FC<MetricsSidebarProps> = ({
  config,
  footprint,
  savedProfiles,
  onChange,
  onReset,
  onSaveProfile,
  onLoadProfile,
  onImportJson,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('visual');
  const [profileNameInput, setProfileNameInput] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateVisual = <K extends keyof AetherConfig['visual']>(
    key: K,
    value: AetherConfig['visual'][K]
  ) => {
    onChange({ ...config, visual: { ...config.visual, [key]: value } });
  };

  const updateOperational = <K extends keyof AetherConfig['operational']>(
    key: K,
    value: AetherConfig['operational'][K]
  ) => {
    onChange({ ...config, operational: { ...config.operational, [key]: value } });
  };

  const updateLanguage = <K extends keyof AetherConfig['language']>(
    key: K,
    value: AetherConfig['language'][K]
  ) => {
    onChange({ ...config, language: { ...config.language, [key]: value } });
  };

  const updateBridge = (
    bridgeKey: keyof AetherConfig['compat']['bridges'],
    patch: Partial<AetherConfig['compat']['bridges']['win32']>
  ) => {
    onChange({
      ...config,
      compat: {
        ...config.compat,
        bridges: {
          ...config.compat.bridges,
          [bridgeKey]: {
            ...config.compat.bridges[bridgeKey],
            ...patch,
          },
        },
      },
    });
  };

  const applyHardwareProfile = (profile: HardwareProfileId) => {
    if (profile === 'legacy-128mb') {
      onChange({
        ...config,
        operational: {
          ...config.operational,
          hardwareProfile: profile,
          minRamMb: 128,
          memoryCompression: true,
          bypassTpm2: true,
          bypassSecureBoot: true,
          legacyCpuFallback: true,
          cpuQuantumMs: 6,
        },
        language: {
          ...config.language,
          optimization: 'size-min',
        },
      });
    } else if (profile === 'balanced-1gb') {
      onChange({
        ...config,
        operational: {
          ...config.operational,
          hardwareProfile: profile,
          minRamMb: 512,
          cpuQuantumMs: 4,
        },
      });
    } else if (profile === 'workstation-4gb') {
      onChange({
        ...config,
        operational: {
          ...config.operational,
          hardwareProfile: profile,
          minRamMb: 2048,
          cpuQuantumMs: 2,
        },
      });
    } else {
      updateOperational('hardwareProfile', 'custom');
    }
  };

  const handleExportProfileJson = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.visual.osName.toLowerCase().replace(/\s+/g, '-')}-profile.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportProfileJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AetherConfig;
        if (!parsed.visual || !parsed.operational || !parsed.language || !parsed.compat) {
          setImportError('Arquivo JSON incompatível com o esquema AetherOS.');
          return;
        }
        setImportError(null);
        onImportJson(parsed);
      } catch {
        setImportError('Não foi possível ler o arquivo JSON selecionado.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileNameInput.trim();
    if (!trimmed) return;
    onSaveProfile(trimmed);
    setProfileNameInput('');
    setShowSaveForm(false);
  };

  const ramRatioPct = Math.min(
    100,
    Math.round((footprint.totalIdleRamMb / Math.max(128, config.operational.minRamMb)) * 100)
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-[#111827] lg:w-[308px] lg:shrink-0">
      {/* Compact Footprint Summary */}
      <div className="border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Pegada Estimada do SO</span>
          <span
            className={`font-mono text-xs font-medium tabular-nums ${
              footprint.totalIdleRamMb > config.operational.minRamMb
                ? 'text-red-400'
                : footprint.runsOn128Mb
                  ? 'text-emerald-400'
                  : 'text-sky-400'
            }`}
          >
            {footprint.totalIdleRamMb} / {config.operational.minRamMb} MB
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-200 ${
              footprint.totalIdleRamMb > config.operational.minRamMb
                ? 'bg-red-500'
                : ramRatioPct > 80
                  ? 'bg-amber-500'
                  : 'bg-sky-400'
            }`}
            style={{ width: `${ramRatioPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span>ISO ~{footprint.isoSizeMb} MB</span>
          <span aria-hidden="true">·</span>
          <span>Boot ~{(footprint.bootTimeMs / 1000).toFixed(2)}s</span>
          <span aria-hidden="true">·</span>
          <span>{footprint.legacyHardwareReady ? 'PC Legado OK' : 'Requer Moderno'}</span>
        </div>
      </div>

      {/* Category Switcher */}
      <div className="border-b border-white/10 px-3 py-2.5">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0B0F17] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'visual'
                ? 'bg-[#1E293B] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="h-3.5 w-3.5 shrink-0" />
            <span>Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kernel')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'kernel'
                ? 'bg-[#1E293B] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span>Kernel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compat')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'compat'
                ? 'bg-[#1E293B] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>VMM</span>
          </button>
        </div>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Quick Presets Bar */}
        <div className="mb-5 border-b border-white/10 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200">Perfis Rápidos</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSaveForm((s) => !s)}
                title="Salvar perfil atual"
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportProfileJson}
                title="Exportar configuração JSON"
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Importar configuração JSON"
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onReset}
                title="Restaurar padrões"
                className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportProfileJson}
                className="hidden"
              />
            </div>
          </div>

          {showSaveForm && (
            <form onSubmit={handleSaveSubmit} className="mb-2.5 flex gap-1.5">
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="Nome do perfil..."
                className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400"
              >
                Salvar
              </button>
            </form>
          )}

          {importError && (
            <p className="mb-2 text-xs text-red-400">{importError}</p>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PRESETS.map((preset) => {
              const isSelected =
                config.visual.codename === preset.config.visual.codename &&
                config.operational.minRamMb === preset.config.operational.minRamMb &&
                config.visual.paradigm === preset.config.visual.paradigm;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(preset.config)}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-sky-400/60 bg-sky-500/10 text-slate-100'
                      : 'border-white/10 bg-[#0B0F17]/70 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="truncate text-xs font-medium">{preset.name}</div>
                </button>
              );
            })}
          </div>

          {savedProfiles.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <div className="text-[11px] text-slate-400">Perfis salvos localmente</div>
              {savedProfiles.slice(0, 3).map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => onLoadProfile(sp)}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-[#0B0F17]/50 px-2.5 py-1.5 text-left text-xs text-slate-300 hover:border-sky-400/40 hover:text-white"
                >
                  <span className="truncate">{sp.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                    {sp.config.operational.minRamMb}MB
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: VISUAL & ERGONOMICS */}
        {activeTab === 'visual' && (
          <div className="space-y-5">
            {/* Identity */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">Identidade do Sistema</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Nome do SO</label>
                  <input
                    type="text"
                    value={config.visual.osName}
                    onChange={(e) => updateVisual('osName', e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Codinome</label>
                  <input
                    type="text"
                    value={config.visual.codename}
                    onChange={(e) => updateVisual('codename', e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Ergonomic Paradigm */}
            <section className="space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Ergonomia Familiar</h3>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      id: 'classic-bottom',
                      label: 'Barra Inferior Clássica',
                      hint: 'Menu Iniciar e bandeja intuitiva',
                    },
                    {
                      id: 'spatial-dock',
                      label: 'Dock Espacial',
                      hint: 'Menu superior e dock flutuante',
                    },
                    {
                      id: 'hybrid-aether',
                      label: 'Híbrido Aether',
                      hint: 'Barra enxuta e lançador central',
                    },
                  ] as Array<{ id: ErgonomicParadigm; label: string; hint: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateVisual('paradigm', item.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      config.visual.paradigm === item.id
                        ? 'border-sky-400/60 bg-sky-500/10 text-white'
                        : 'border-white/10 bg-[#0B0F17]/60 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.hint}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Wallpapers */}
            <section className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">Papel de Parede</h3>
                <div className="flex rounded-md bg-[#0B0F17] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => updateVisual('desktopTheme', 'dark')}
                    className={`rounded px-2 py-0.5 transition-colors ${
                      config.visual.desktopTheme === 'dark'
                        ? 'bg-[#1E293B] text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    Escuro
                  </button>
                  <button
                    type="button"
                    onClick={() => updateVisual('desktopTheme', 'light')}
                    className={`rounded px-2 py-0.5 transition-colors ${
                      config.visual.desktopTheme === 'light'
                        ? 'bg-[#1E293B] text-white'
                        : 'text-slate-400'
                    }`}
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
                    onClick={() => updateVisual('wallpaperId', wp.id)}
                    className={`group relative overflow-hidden rounded-md border text-left transition-all ${
                      config.visual.wallpaperId === wp.id
                        ? 'border-sky-400 ring-1 ring-sky-400/60'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div
                      className="h-14 w-full"
                      style={{ background: wp.fallbackGradient }}
                    >
                      <img
                        src={wp.imagePath}
                        alt={wp.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="bg-[#0B0F17]/90 px-2 py-1 text-[11px] font-medium text-slate-200 truncate">
                      {wp.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Liquid Glass Metrics */}
            <section className="space-y-3.5 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Métricas Liquid Glass</h3>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">Opacidade do Vidro</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.visual.glassOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={92}
                  value={config.visual.glassOpacity}
                  onChange={(e) => updateVisual('glassOpacity', Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">Desfoque Óptico (Blur)</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.visual.glassBlurPx} px
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={32}
                  value={config.visual.glassBlurPx}
                  onChange={(e) => updateVisual('glassBlurPx', Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">Raio das Janelas</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.visual.borderRadiusPx} px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={config.visual.borderRadiusPx}
                  onChange={(e) => updateVisual('borderRadiusPx', Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>

              {/* Accent Swatches */}
              <div>
                <div className="mb-1.5 text-xs text-slate-300">Cor de Destaque do Desktop</div>
                <div className="flex items-center gap-2">
                  {ACCENT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      title={swatch.name}
                      onClick={() => updateVisual('accentColor', swatch.hex)}
                      className={`h-6 w-6 rounded-full border-2 transition-transform ${
                        config.visual.accentColor === swatch.hex
                          ? 'scale-110 border-white'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Density & Window controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Densidade</label>
                  <select
                    value={config.visual.density}
                    onChange={(e) =>
                      updateVisual('density', e.target.value as AetherConfig['visual']['density'])
                    }
                    className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="compact">Compacta</option>
                    <option value="standard">Padrão</option>
                    <option value="comfortable">Confortável</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Botões de Janela</label>
                  <select
                    value={config.visual.windowControls}
                    onChange={(e) =>
                      updateVisual(
                        'windowControls',
                        e.target.value as AetherConfig['visual']['windowControls']
                      )
                    }
                    className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="right">Direita (Clássico)</option>
                    <option value="left">Esquerda (Estúdio)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: KERNEL & HARDWARE */}
        {activeTab === 'kernel' && (
          <div className="space-y-5">
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">Perfil de Hardware Alvo</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'legacy-128mb', label: 'Legado 128 MB' },
                    { id: 'balanced-1gb', label: 'Equilibrado 512 MB' },
                    { id: 'workstation-4gb', label: 'Estação 2 GB+' },
                    { id: 'custom', label: 'Personalizado' },
                  ] as Array<{ id: HardwareProfileId; label: string }>
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyHardwareProfile(p.id)}
                    className={`rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                      config.operational.hardwareProfile === p.id
                        ? 'border-sky-400/60 bg-sky-500/10 text-white'
                        : 'border-white/10 bg-[#0B0F17]/60 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">RAM Mínima Garantida</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.operational.minRamMb} MB
                  </span>
                </div>
                <input
                  type="range"
                  min={128}
                  max={4096}
                  step={64}
                  value={config.operational.minRamMb}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChange({
                      ...config,
                      operational: {
                        ...config.operational,
                        hardwareProfile: 'custom',
                        minRamMb: val,
                      },
                    });
                  }}
                  className="aether-slider w-full"
                />
              </div>
            </section>

            {/* Hardware Restrictions Bypass (FlowOS workflow inspiration) */}
            <section className="space-y-2.5 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Revitalização de PCs Antigos</h3>
              {[
                {
                  key: 'bypassTpm2' as const,
                  label: 'Ignorar exigência de TPM 2.0',
                  desc: 'Instalação livre em placas-mãe antigas',
                },
                {
                  key: 'bypassSecureBoot' as const,
                  label: 'Secure Boot opcional',
                  desc: 'Permite inicialização BIOS Legacy e UEFI',
                },
                {
                  key: 'legacyCpuFallback' as const,
                  label: 'Fallback sem SSE4.2 / POPCNT',
                  desc: 'Compila rotina compatível com CPUs Core 2 / antigas',
                },
                {
                  key: 'memoryCompression' as const,
                  label: 'Compressão de Páginas ZPool',
                  desc: 'Reduz pegada de RAM em ~24% no kernel',
                },
                {
                  key: 'dualBootEnabled' as const,
                  label: 'Instalador Dual-Boot Gráfico',
                  desc: 'Coexiste com Windows, macOS ou Linux sem apagar dados',
                },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex cursor-pointer items-start justify-between gap-3 py-1"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-200">{toggle.label}</div>
                    <div className="text-[11px] text-slate-400">{toggle.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.operational[toggle.key]}
                    onChange={(e) => updateOperational(toggle.key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0B0F17] accent-sky-400"
                  />
                </label>
              ))}
            </section>

            {/* Chronos Microkernel */}
            <section className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Microkernel Chronos</h3>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Política do Escalonador
                </label>
                <select
                  value={config.operational.schedulerPolicy}
                  onChange={(e) =>
                    updateOperational('schedulerPolicy', e.target.value as SchedulerPolicy)
                  }
                  className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="chronos-deterministic">Determinístico Justo (Anel)</option>
                  <option value="hybrid-cooperative">Cooperativo Híbrido (Baixo Consumo)</option>
                  <option value="realtime-strict">Tempo Real Estrito (Baixa Latência)</option>
                </select>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">Quantum de CPU</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.operational.cpuQuantumMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={config.operational.cpuQuantumMs}
                  onChange={(e) => updateOperational('cpuQuantumMs', Number(e.target.value))}
                  className="aether-slider w-full"
                />
              </div>
            </section>

            {/* AetherLang */}
            <section className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Compilador AetherLang</h3>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">Modelo de Memória</label>
                <select
                  value={config.language.memoryModel}
                  onChange={(e) =>
                    updateLanguage('memoryModel', e.target.value as MemorySafetyModel)
                  }
                  className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="linear-ownership">Ownership Linear (Sem GC)</option>
                  <option value="deterministic-rc">Contagem Determinística (RC)</option>
                  <option value="static-arena">Arenas Estáticas (Ultra-compacto)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">Otimização Alvo</label>
                <select
                  value={config.language.optimization}
                  onChange={(e) =>
                    updateLanguage(
                      'optimization',
                      e.target.value as AetherConfig['language']['optimization']
                    )
                  }
                  className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="size-min">Tamanho Mínimo (PC Legado)</option>
                  <option value="balanced">Equilibrado</option>
                  <option value="max-perf">Desempenho Máximo</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-between py-1">
                <span className="text-xs text-slate-300">Exigir Strict Capabilities</span>
                <input
                  type="checkbox"
                  checked={config.language.strictCapabilities}
                  onChange={(e) => updateLanguage('strictCapabilities', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#0B0F17] accent-sky-400"
                />
              </label>
            </section>
          </div>
        )}

        {/* TAB 3: COMPATIBILITY & VIRTUALIZATION */}
        {activeTab === 'compat' && (
          <div className="space-y-5">
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-200">Motor Universal PolyFS</h3>
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">Política de Sandbox</label>
                <select
                  value={config.compat.sandboxPolicy}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      compat: {
                        ...config.compat,
                        sandboxPolicy: e.target.value as AetherConfig['compat']['sandboxPolicy'],
                      },
                    })
                  }
                  className="w-full rounded-md border border-white/10 bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <option value="strict-capability">Isolamento Estrito por Capability</option>
                  <option value="balanced-user">Equilibrado (Pasta do Usuário)</option>
                  <option value="direct-inspect">Inspeção Direta (Desenvolvedor)</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-between py-1">
                <span className="text-xs text-slate-300">Decodificação automática de extensões</span>
                <input
                  type="checkbox"
                  checked={config.compat.universalCodecAutoDecode}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      compat: {
                        ...config.compat,
                        universalCodecAutoDecode: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-white/20 bg-[#0B0F17] accent-sky-400"
                />
              </label>
            </section>

            <section className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-xs font-semibold text-slate-200">Pontes AetherVMM (Apps Legados)</h3>

              {(
                [
                  { key: 'win32', label: 'Windows (.exe / .msi)', bridge: 'Win32 PE Bridge' },
                  { key: 'android', label: 'Android (.apk / .aab)', bridge: 'ART / Binder Bridge' },
                  { key: 'macos', label: 'macOS (.dmg / .pkg)', bridge: 'Mach-O / Cocoa Bridge' },
                  { key: 'linux', label: 'Linux (.AppImage / ELF)', bridge: 'ELF Syscall Bridge' },
                ] as const
              ).map((item) => {
                const b = config.compat.bridges[item.key];
                return (
                  <div
                    key={item.key}
                    className="space-y-2 border-b border-white/10 pb-3 last:border-b-0"
                  >
                    <label className="flex cursor-pointer items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-slate-200">{item.label}</div>
                        <div className="text-[11px] text-slate-400">{item.bridge}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={b.enabled}
                        onChange={(e) => updateBridge(item.key, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded border-white/20 bg-[#0B0F17] accent-sky-400"
                      />
                    </label>
                    {b.enabled && (
                      <div className="space-y-1.5 pl-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Teto de RAM por App</span>
                          <span className="font-mono text-slate-200 tabular-nums">
                            {b.maxRamMb} MB
                          </span>
                        </div>
                        <input
                          type="range"
                          min={48}
                          max={1024}
                          step={32}
                          value={b.maxRamMb}
                          onChange={(e) =>
                            updateBridge(item.key, { maxRamMb: Number(e.target.value) })
                          }
                          className="aether-slider w-full"
                        />
                        <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-400">
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={b.gpuAcceleration}
                              onChange={(e) =>
                                updateBridge(item.key, { gpuAcceleration: e.target.checked })
                              }
                              className="h-3.5 w-3.5 accent-sky-400"
                            />
                            <span>GPU Virtual</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={b.networkIsolated}
                              onChange={(e) =>
                                updateBridge(item.key, { networkIsolated: e.target.checked })
                              }
                              className="h-3.5 w-3.5 accent-sky-400"
                            />
                            <span>Isolar Rede</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};
