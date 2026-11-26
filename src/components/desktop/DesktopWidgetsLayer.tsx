import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, AppWindow, HardDrive, StickyNote } from 'lucide-react';
import {
  AetherConfig,
  DesktopAppId,
  SystemFootprint,
  WidgetId,
} from '../../types/aether';
import { STORAGE_DRIVES } from '../../data/osCatalog';
import { ContextMenuItem, getMotionTransition } from './DesktopContextMenu';

interface DesktopWidgetsLayerProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  enabledWidgets: WidgetId[];
  widgetWidths: Partial<Record<WidgetId, number>>;
  quickNoteText: string;
  activeAppRamMb: number;
  activeProcessCount: number;
  isTopBarLayout: boolean;
  isLight: boolean;
  glassStyle: React.CSSProperties;
  onUpdateQuickNote: (text: string) => void;
  onResizeWidget: (id: WidgetId, nextWidth: number) => void;
  onHideWidget: (id: WidgetId) => void;
  onOpenWidgetContextMenu: (
    e: React.MouseEvent,
    title: string,
    items: ContextMenuItem[]
  ) => void;
  onOpenApp: (id: DesktopAppId) => void;
}

export const DesktopWidgetsLayer: React.FC<DesktopWidgetsLayerProps> = ({
  config,
  footprint,
  enabledWidgets,
  widgetWidths,
  quickNoteText,
  activeAppRamMb,
  activeProcessCount,
  isTopBarLayout,
  isLight,
  glassStyle,
  onUpdateQuickNote,
  onResizeWidget,
  onHideWidget,
  onOpenWidgetContextMenu,
  onOpenApp,
}) => {
  const [now, setNow] = useState(() => new Date());
  const resizeRef = useRef<{ id: WidgetId; startX: number; origW: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const next = Math.max(200, Math.min(380, Math.round(r.origW + (e.clientX - r.startX))));
      onResizeWidget(r.id, next);
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onResizeWidget]);

  if (enabledWidgets.length === 0) return null;

  const totalRamUsed = footprint.totalIdleRamMb + activeAppRamMb;
  const ramPct = Math.min(100, Math.round((totalRamUsed / config.operational.minRamMb) * 100));
  const borderCls = isLight ? 'border-slate-900/15' : 'border-white/15';
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-300/80';
  const transition = getMotionTransition(config.visual.animationProfile);

  const widthOf = (id: WidgetId) => widgetWidths[id] ?? 252;

  const startResize = (e: React.MouseEvent, id: WidgetId) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { id, startX: e.clientX, origW: widthOf(id) };
  };

  const handleWidgetMenu = (e: React.MouseEvent, id: WidgetId, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenWidgetContextMenu(e, `Widget · ${label}`, [
      { id: 'w-compact', label: 'Tamanho Compacto (210px)', onSelect: () => onResizeWidget(id, 210) },
      { id: 'w-std', label: 'Tamanho Padrão (256px)', onSelect: () => onResizeWidget(id, 256) },
      { id: 'w-wide', label: 'Tamanho Largo (330px)', onSelect: () => onResizeWidget(id, 330) },
      {
        id: 'w-hide',
        label: 'Ocultar Widget',
        danger: true,
        dividerBefore: true,
        onSelect: () => onHideWidget(id),
      },
    ]);
  };

  const resizeHandle = (id: WidgetId) => (
    <div
      onMouseDown={(e) => startResize(e, id)}
      title="Arraste para redimensionar widget"
      className="absolute bottom-1 right-1 h-3.5 w-3.5 cursor-ew-resize rounded-br opacity-40 hover:opacity-100"
    >
      <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
        <path d="M10 4L4 10M10 8L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`pointer-events-none absolute left-4 z-10 flex flex-col gap-3 ${
        isTopBarLayout ? 'top-14' : 'top-4'
      }`}
    >
      <AnimatePresence initial={false}>
        {enabledWidgets.includes('clock') && (
          <motion.div
            key="widget-clock"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={transition}
            onContextMenu={(e) => handleWidgetMenu(e, 'clock', 'Relógio')}
            style={{ ...glassStyle, width: `${widthOf('clock')}px` }}
            className={`pointer-events-auto relative border p-4 shadow-xl ${borderCls}`}
          >
            <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`mt-1 text-xs capitalize ${mutedCls}`}>
              {now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            {resizeHandle('clock')}
          </motion.div>
        )}

        {enabledWidgets.includes('telemetry') && (
          <motion.div
            key="widget-telemetry"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={transition}
            onContextMenu={(e) => handleWidgetMenu(e, 'telemetry', 'Monitor Chronos')}
            style={{ ...glassStyle, width: `${widthOf('telemetry')}px` }}
            className={`pointer-events-auto relative border p-3.5 shadow-xl ${borderCls}`}
          >
            <button
              type="button"
              onClick={() => onOpenApp('taskmanager')}
              className="block w-full text-left"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" style={{ color: config.visual.accentColor }} />
                  <span>Chronos Monitor</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums">{ramPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${ramPct}%`,
                    backgroundColor: ramPct > 85 ? '#F59E0B' : config.visual.accentColor,
                  }}
                />
              </div>
              <div className={`mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums ${mutedCls}`}>
                <span>
                  {totalRamUsed} / {config.operational.minRamMb} MB
                </span>
                <span>{activeProcessCount} tarefas</span>
              </div>
            </button>
            {resizeHandle('telemetry')}
          </motion.div>
        )}

        {enabledWidgets.includes('quick-notes') && (
          <motion.div
            key="widget-notes"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={transition}
            onContextMenu={(e) => handleWidgetMenu(e, 'quick-notes', 'Notas Rápidas')}
            style={{ ...glassStyle, width: `${widthOf('quick-notes')}px` }}
            className={`pointer-events-auto relative border p-3.5 shadow-xl ${borderCls}`}
          >
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" style={{ color: config.visual.accentColor }} />
                <span>Notas Rápidas</span>
              </span>
              <span className={`text-[10px] ${mutedCls}`}>Redimensionável</span>
            </div>
            <textarea
              value={quickNoteText}
              onChange={(e) => onUpdateQuickNote(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full resize-none bg-transparent text-xs leading-relaxed focus:outline-none"
            />
            {resizeHandle('quick-notes')}
          </motion.div>
        )}

        {enabledWidgets.includes('storage') && (
          <motion.div
            key="widget-storage"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={transition}
            onContextMenu={(e) => handleWidgetMenu(e, 'storage', 'Unidades')}
            style={{ ...glassStyle, width: `${widthOf('storage')}px` }}
            className={`pointer-events-auto relative border p-3.5 shadow-xl ${borderCls}`}
          >
            <button
              type="button"
              onClick={() => onOpenApp('polyfs')}
              className="block w-full text-left"
            >
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <HardDrive className="h-3.5 w-3.5" style={{ color: config.visual.accentColor }} />
                <span>Unidades PolyFS</span>
              </div>
              <div className="space-y-2">
                {STORAGE_DRIVES.slice(0, 3).map((d) => {
                  const pct = Math.round((d.usedGb / d.totalGb) * 100);
                  return (
                    <div key={d.id} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium">
                          {d.letter} {d.label}
                        </span>
                        <span className={`font-mono tabular-nums ${mutedCls}`}>
                          {d.usedGb}/{d.totalGb} GB
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-black/25">
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, backgroundColor: config.visual.accentColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
            {resizeHandle('storage')}
          </motion.div>
        )}

        {enabledWidgets.includes('vmm-dock') && (
          <motion.div
            key="widget-vmm"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={transition}
            onContextMenu={(e) => handleWidgetMenu(e, 'vmm-dock', 'Lançador VMM')}
            style={{ ...glassStyle, width: `${widthOf('vmm-dock')}px` }}
            className={`pointer-events-auto relative border p-3.5 shadow-xl ${borderCls}`}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <AppWindow className="h-3.5 w-3.5" style={{ color: config.visual.accentColor }} />
              <span>Acesso Rápido VMM</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {(
                [
                  { id: 'legacy-win32', label: 'Win32 .exe', key: 'win32' },
                  { id: 'legacy-android', label: 'Android .apk', key: 'android' },
                  { id: 'legacy-macos', label: 'macOS .dmg', key: 'macos' },
                  { id: 'legacy-linux', label: 'Linux ELF', key: 'linux' },
                ] as const
              ).map((b) => {
                const active = config.compat.bridges[b.key].enabled;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!active}
                    onClick={() => onOpenApp(b.id)}
                    className={`rounded-md border px-2 py-1.5 text-left font-medium transition-colors ${
                      active
                        ? `${borderCls} hover:bg-white/10`
                        : 'cursor-not-allowed border-transparent opacity-40'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            {resizeHandle('vmm-dock')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
