import React from 'react';
import { motion } from 'motion/react';
import { PanelLeft, PanelRight, X } from 'lucide-react';
import {
  AetherConfig,
  DesktopWindowState,
  MultitaskLayoutPreset,
} from '../../types/aether';
import { MULTITASK_LAYOUT_PRESETS } from '../../data/osCatalog';
import { getAppIcon } from './AppGridAndMultitask';

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  dividerBefore?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  header?: string;
  items: ContextMenuItem[];
}

export function getMotionTransition(profile: AetherConfig['visual']['animationProfile']) {
  if (profile === 'reduced') {
    return { duration: 0.05 };
  }
  if (profile === 'snappy') {
    return { duration: 0.13, ease: [0.16, 1, 0.3, 1] as const };
  }
  return { type: 'spring' as const, stiffness: 360, damping: 28, mass: 0.85 };
}

interface DesktopContextMenuProps {
  menu: ContextMenuState;
  config: AetherConfig;
  isLight: boolean;
  glassStyle: React.CSSProperties;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
}

export const DesktopContextMenu: React.FC<DesktopContextMenuProps> = ({
  menu,
  config,
  isLight,
  glassStyle,
  containerWidth,
  containerHeight,
  onClose,
}) => {
  const menuW = 228;
  const estH = Math.min(360, menu.items.length * 32 + 34);
  const left = Math.max(8, Math.min(containerWidth - menuW - 8, menu.x));
  const top = Math.max(8, Math.min(containerHeight - estH - 8, menu.y));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={getMotionTransition(config.visual.animationProfile)}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...glassStyle,
        left: `${left}px`,
        top: `${top}px`,
        width: `${menuW}px`,
      }}
      className={`absolute z-[70] overflow-hidden border py-1.5 shadow-2xl ${
        isLight ? 'border-slate-900/15 text-slate-900' : 'border-white/15 text-slate-100'
      }`}
    >
      {menu.header && (
        <div
          className={`border-b px-3 py-1.5 text-[11px] font-semibold ${
            isLight
              ? 'border-slate-900/10 text-slate-500'
              : 'border-white/10 text-slate-400'
          }`}
        >
          {menu.header}
        </div>
      )}
      <div className="py-0.5">
        {menu.items.map((item) => (
          <React.Fragment key={item.id}>
            {item.dividerBefore && (
              <div
                className={`my-1 h-px ${isLight ? 'bg-slate-900/10' : 'bg-white/10'}`}
              />
            )}
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/15'
                  : isLight
                    ? 'hover:bg-slate-900/10'
                    : 'hover:bg-white/10'
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.shortcut && (
                <span className="shrink-0 font-mono text-[10px] opacity-55">
                  {item.shortcut}
                </span>
              )}
            </button>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

/* ============================================================================
   TASKBAR / DOCK LIVE WINDOW HOVER PREVIEW CARD
   ============================================================================ */
interface TaskbarLivePreviewProps {
  win: DesktopWindowState;
  anchorX: number;
  containerWidth: number;
  config: AetherConfig;
  isLight: boolean;
  glassStyle: React.CSSProperties;
  onFocus: () => void;
  onSnap: (side: 'left' | 'right') => void;
  onCloseWin: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const TaskbarLivePreviewCard: React.FC<TaskbarLivePreviewProps> = ({
  win,
  anchorX,
  containerWidth,
  config,
  isLight,
  glassStyle,
  onFocus,
  onSnap,
  onCloseWin,
  onMouseEnter,
  onMouseLeave,
}) => {
  const cardW = 248;
  const clampedLeft = Math.max(10, Math.min(containerWidth - cardW - 10, anchorX - cardW / 2));
  const bottomOffset = config.visual.paradigm === 'classic-bottom' ? 54 : 68;

  const renderMiniature = () => {
    const lineCls = isLight ? 'bg-slate-900/15' : 'bg-white/15';
    const boxCls = isLight ? 'bg-slate-900/10' : 'bg-white/10';
    if (win.id === 'polyfs') {
      return (
        <div className="grid h-full grid-cols-12 gap-1.5 p-2">
          <div className="col-span-3 space-y-1">
            <div className={`h-2 w-full rounded ${lineCls}`} />
            <div className={`h-2 w-4/5 rounded ${lineCls}`} />
            <div className={`h-2 w-3/4 rounded ${lineCls}`} />
            <div className="mt-2 h-3 w-full rounded" style={{ backgroundColor: `${config.visual.accentColor}45` }} />
          </div>
          <div className="col-span-4 space-y-1">
            <div className={`h-3 w-full rounded ${boxCls}`} />
            <div className={`h-3 w-full rounded ${boxCls}`} />
            <div className={`h-3 w-full rounded ${boxCls}`} />
          </div>
          <div className={`col-span-5 rounded p-1.5 ${boxCls}`}>
            <div className={`h-2 w-3/4 rounded ${lineCls}`} />
            <div className={`mt-1.5 h-10 w-full rounded ${lineCls}`} />
          </div>
        </div>
      );
    }
    if (win.id === 'terminal') {
      return (
        <div className="h-full bg-[#060910] p-2 font-mono text-[8px] leading-tight text-sky-300/90">
          <div>aether@chronos &gt; sys.info</div>
          <div className="text-slate-400">Kernel: Chronos · {config.operational.cpuQuantumMs}ms</div>
          <div className="text-slate-400">RAM: {config.operational.minRamMb} MB Alvo</div>
          <div className="mt-1 text-emerald-400">OK · Capabilities Verificadas</div>
        </div>
      );
    }
    if (win.id === 'appstore') {
      return (
        <div className="grid h-full grid-cols-2 gap-1.5 p-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`rounded p-1.5 ${boxCls}`}>
              <div className="h-2 w-3/4 rounded" style={{ backgroundColor: `${config.visual.accentColor}75` }} />
              <div className={`mt-1 h-1.5 w-full rounded ${lineCls}`} />
            </div>
          ))}
        </div>
      );
    }
    if (win.id === 'taskmanager') {
      return (
        <div className="space-y-1.5 p-2">
          <div className="flex gap-1.5">
            <div className="h-4 flex-1 rounded" style={{ backgroundColor: `${config.visual.accentColor}50` }} />
            <div className={`h-4 flex-1 rounded ${boxCls}`} />
          </div>
          <div className={`h-2 w-full rounded ${lineCls}`} />
          <div className={`h-2 w-5/6 rounded ${lineCls}`} />
          <div className={`h-2 w-4/5 rounded ${lineCls}`} />
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col justify-between p-2.5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-950"
            style={{ backgroundColor: config.visual.accentColor }}
          >
            {getAppIcon(win.id, 'h-3.5 w-3.5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`h-2 w-2/3 rounded ${lineCls}`} />
            <div className={`mt-1 h-1.5 w-1/2 rounded ${lineCls}`} />
          </div>
        </div>
        <div className={`h-10 w-full rounded ${boxCls}`} />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={getMotionTransition(config.visual.animationProfile)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...glassStyle,
        left: `${clampedLeft}px`,
        bottom: `${bottomOffset}px`,
        width: `${cardW}px`,
      }}
      className={`absolute z-[65] overflow-hidden border p-2.5 shadow-2xl ${
        isLight ? 'border-slate-900/15 text-slate-900' : 'border-white/15 text-slate-100'
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 opacity-80">{getAppIcon(win.id, 'h-3.5 w-3.5')}</span>
          <span className="truncate text-[11px] font-semibold">{win.title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            title="Encaixar à Esquerda"
            onClick={() => onSnap('left')}
            className="rounded p-1 opacity-75 hover:bg-white/15 hover:opacity-100"
          >
            <PanelLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Encaixar à Direita"
            onClick={() => onSnap('right')}
            className="rounded p-1 opacity-75 hover:bg-white/15 hover:opacity-100"
          >
            <PanelRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Fechar Janela"
            onClick={onCloseWin}
            className="rounded p-1 opacity-75 hover:bg-red-500/20 hover:text-red-400 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Clickable Live Miniature */}
      <button
        type="button"
        onClick={onFocus}
        className={`block h-24 w-full overflow-hidden rounded-lg border text-left transition-transform hover:scale-[1.01] ${
          isLight ? 'border-slate-900/15 bg-white/70' : 'border-white/15 bg-[#0A101D]/80'
        }`}
      >
        {renderMiniature()}
      </button>

      {/* Metadata footer (unboxed text) */}
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] opacity-70 tabular-nums">
        <span>
          Área {win.workspaceId} · {win.isMinimized ? 'Minimizada' : 'Ativa'}
        </span>
        <span>
          {win.ramMb} MB · {win.cpuPct.toFixed(1)}% CPU
        </span>
      </div>
    </motion.div>
  );
};

/* ============================================================================
   SNAP LAYOUTS VISUAL PICKER (6 PRE-PROGRAMMED MULTITASKING SCHEMES)
   ============================================================================ */
export const LayoutDiagramGlyph: React.FC<{
  preset: MultitaskLayoutPreset;
  accent: string;
}> = ({ preset, accent }) => {
  const fillA = accent;
  const fillB = 'rgba(148, 163, 184, 0.35)';
  const fillC = 'rgba(148, 163, 184, 0.22)';

  return (
    <svg viewBox="0 0 48 30" className="h-7 w-11 shrink-0" aria-hidden="true">
      {preset === 'split-50' && (
        <>
          <rect x="2" y="2" width="21" height="26" rx="2" fill={fillA} />
          <rect x="25" y="2" width="21" height="26" rx="2" fill={fillB} />
        </>
      )}
      {preset === 'master-stack' && (
        <>
          <rect x="2" y="2" width="26" height="26" rx="2" fill={fillA} />
          <rect x="30" y="2" width="16" height="12" rx="2" fill={fillB} />
          <rect x="30" y="16" width="16" height="12" rx="2" fill={fillC} />
        </>
      )}
      {preset === 'three-cols' && (
        <>
          <rect x="2" y="2" width="13.5" height="26" rx="2" fill={fillA} />
          <rect x="17.25" y="2" width="13.5" height="26" rx="2" fill={fillB} />
          <rect x="32.5" y="2" width="13.5" height="26" rx="2" fill={fillC} />
        </>
      )}
      {preset === 'grid-2x2' && (
        <>
          <rect x="2" y="2" width="21" height="12" rx="2" fill={fillA} />
          <rect x="25" y="2" width="21" height="12" rx="2" fill={fillB} />
          <rect x="2" y="16" width="21" height="12" rx="2" fill={fillC} />
          <rect x="25" y="16" width="21" height="12" rx="2" fill={fillB} />
        </>
      )}
      {preset === 'center-focus' && (
        <>
          <rect x="2" y="2" width="9" height="26" rx="2" fill={fillC} />
          <rect x="13" y="2" width="22" height="26" rx="2" fill={fillA} />
          <rect x="37" y="2" width="9" height="26" rx="2" fill={fillB} />
        </>
      )}
      {preset === 'cascade' && (
        <>
          <rect x="2" y="2" width="26" height="16" rx="2" fill={fillC} />
          <rect x="11" y="7" width="26" height="16" rx="2" fill={fillB} />
          <rect x="20" y="12" width="26" height="16" rx="2" fill={fillA} />
        </>
      )}
    </svg>
  );
};

interface SnapLayoutsPopoverProps {
  config: AetherConfig;
  isLight: boolean;
  glassStyle: React.CSSProperties;
  onApplyPreset: (preset: MultitaskLayoutPreset) => void;
  onClose: () => void;
  positionClass?: string;
}

export const SnapLayoutsPopover: React.FC<SnapLayoutsPopoverProps> = ({
  config,
  isLight,
  glassStyle,
  onApplyPreset,
  onClose,
  positionClass = 'right-2 top-9',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={getMotionTransition(config.visual.animationProfile)}
      onClick={(e) => e.stopPropagation()}
      style={glassStyle}
      className={`absolute z-[65] w-[304px] border p-3 shadow-2xl ${positionClass} ${
        isLight ? 'border-slate-900/15 text-slate-900' : 'border-white/15 text-slate-100'
      }`}
    >
      <div className="mb-2 text-[11px] font-semibold opacity-80">
        Organizar Janelas Automaticamente
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {MULTITASK_LAYOUT_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onApplyPreset(item.id);
              onClose();
            }}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors ${
              isLight
                ? 'border-slate-900/10 bg-white/50 hover:border-sky-500 hover:bg-white'
                : 'border-white/10 bg-white/5 hover:border-sky-400/60 hover:bg-white/10'
            }`}
          >
            <LayoutDiagramGlyph preset={item.id} accent={config.visual.accentColor} />
            <span className="text-[11px] font-medium leading-tight">{item.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
