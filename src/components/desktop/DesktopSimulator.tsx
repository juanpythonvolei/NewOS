import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Bluetooth,
  Columns2,
  Cpu,
  Expand,
  FolderOpen,
  Globe,
  Grid,
  Layers,
  LayoutGrid,
  Lock,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Power,
  Search,
  Settings,
  ShoppingBag,
  Shrink,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import {
  AetherConfig,
  DesktopAppId,
  DesktopWindowState,
  FileFolder,
  MultitaskLayoutPreset,
  OsUserAccount,
  PolyFileEntry,
  StorageDriveId,
  SystemFootprint,
  WidgetId,
  WorkspaceInfo,
} from '../../types/aether';
import { APP_STORE_CATALOG } from '../../data/osCatalog';
import { LEGACY_APPS, WALLPAPERS } from '../../data/presets';
import {
  AetherShellApp,
  AetherVmmApp,
  LegacyAppWindowContent,
  TaskManagerApp,
} from './DesktopAppsContent';
import {
  AetherBrowserApp,
  AetherCalcApp,
  AetherMediaApp,
  AetherNotesApp,
  AppStoreApp,
  FullFileManagerApp,
  InstalledStoreAppWindow,
  OsSettingsApp,
} from './NativeOsApps';
import { OsLoginScreen } from './OsLoginScreen';
import { DesktopWidgetsLayer } from './DesktopWidgetsLayer';
import {
  AppGridOverlay,
  MultitaskOverviewOverlay,
  WidgetManagerPopover,
  getAppIcon,
} from './AppGridAndMultitask';
import {
  ContextMenuItem,
  ContextMenuState,
  DesktopContextMenu,
  SnapLayoutsPopover,
  TaskbarLivePreviewCard,
  getMotionTransition,
} from './DesktopContextMenu';

interface DesktopSimulatorProps {
  config: AetherConfig;
  footprint: SystemFootprint;
  users: OsUserAccount[];
  activeUser: OsUserAccount;
  polyFiles: PolyFileEntry[];
  folders: FileFolder[];
  selectedPolyFileId: string;
  onSelectPolyFile: (id: string) => void;
  onAddPolyFile: (entry: PolyFileEntry) => void;
  onToggleTrashFile: (id: string) => void;
  onCreateFolder: (name: string, driveId: StorageDriveId) => void;
  onSaveNoteDocument: (filename: string, content: string) => void;
  onUpdateConfig: (next: AetherConfig) => void;
  onToggleWidget: (widgetId: WidgetId) => void;
  onResizeWidget: (widgetId: WidgetId, nextWidth: number) => void;
  onUpdateQuickNote: (text: string) => void;
  onInstallStoreApp: (appId: string) => void;
  onUninstallStoreApp: (appId: string) => void;
  onSwitchUser: (userId: string) => void;
  onCreateUser: (payload: {
    displayName: string;
    username: string;
    pin: string;
    role: OsUserAccount['role'];
    presetId: string;
    avatarColor: string;
  }) => OsUserAccount;
  onExportZip: () => void;
  externalOpenRequest: { appId: DesktopAppId; nonce: number } | null;
}

function buildInitialWindows(): DesktopWindowState[] {
  const base: DesktopWindowState[] = [
    {
      id: 'polyfs',
      title: 'Arquivos & PolyFS',
      subtitle: 'Unidades, Pastas e Decodificador Universal',
      platform: 'aether',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 14,
      x: 290,
      y: 26,
      width: 720,
      height: 430,
      ramMb: 24,
      cpuPct: 1.1,
      pid: 104,
    },
    {
      id: 'appstore',
      title: 'AetherStore — Loja de Apps',
      subtitle: 'Pacotes Nativos .aethpkg e Legados',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 13,
      x: 220,
      y: 38,
      width: 680,
      height: 430,
      ramMb: 26,
      cpuPct: 1.3,
      pid: 108,
    },
    {
      id: 'settings',
      title: 'Configurações do Sistema',
      subtitle: 'Aparência, Contas, Hardware e Docker',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 13,
      x: 240,
      y: 44,
      width: 660,
      height: 420,
      ramMb: 18,
      cpuPct: 0.8,
      pid: 110,
    },
    {
      id: 'notes',
      title: 'AetherNotes',
      subtitle: 'Editor Nativo de Documentos',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 12,
      x: 260,
      y: 52,
      width: 540,
      height: 360,
      ramMb: 14,
      cpuPct: 0.4,
      pid: 114,
    },
    {
      id: 'calc',
      title: 'AetherCalc',
      subtitle: 'Calculadora DEC / HEX / BIN',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 12,
      x: 340,
      y: 62,
      width: 330,
      height: 400,
      ramMb: 9,
      cpuPct: 0.2,
      pid: 116,
    },
    {
      id: 'media',
      title: 'AetherMedia',
      subtitle: 'Galeria e Visualizador',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 12,
      x: 280,
      y: 42,
      width: 610,
      height: 410,
      ramMb: 22,
      cpuPct: 0.9,
      pid: 118,
    },
    {
      id: 'browser',
      title: 'AetherWeb — Docs e Docker',
      subtitle: 'Navegador Nativo do Sistema',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 2,
      zIndex: 12,
      x: 180,
      y: 42,
      width: 650,
      height: 415,
      ramMb: 31,
      cpuPct: 1.5,
      pid: 119,
    },
    {
      id: 'aethervmm',
      title: 'AetherVMM — Apps Legados',
      subtitle: 'Virtualização Win32 · Android · macOS · Linux',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 2,
      zIndex: 11,
      x: 200,
      y: 54,
      width: 630,
      height: 410,
      ramMb: 28,
      cpuPct: 1.6,
      pid: 112,
    },
    {
      id: 'taskmanager',
      title: 'Gerenciador de Tarefas',
      subtitle: 'Chronos Process Monitor',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 15,
      x: 210,
      y: 46,
      width: 630,
      height: 385,
      ramMb: 14,
      cpuPct: 0.9,
      pid: 120,
    },
    {
      id: 'terminal',
      title: 'AetherShell',
      subtitle: 'Console Nativo AetherLang',
      platform: 'aether',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      snapMode: 'free',
      workspaceId: 1,
      zIndex: 10,
      x: 245,
      y: 66,
      width: 590,
      height: 365,
      ramMb: 12,
      cpuPct: 0.5,
      pid: 128,
    },
  ];

  const legacyWins: DesktopWindowState[] = LEGACY_APPS.map((app, index) => ({
    id: app.id as DesktopAppId,
    title: `${app.name} (${app.binaryName})`,
    subtitle: app.platformLabel,
    platform: app.platform,
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    snapMode: 'free',
    workspaceId: 1,
    zIndex: 16 + index,
    x: 180 + index * 24,
    y: 46 + index * 20,
    width: app.platform === 'android' ? 430 : 600,
    height: app.platform === 'android' ? 430 : 395,
    ramMb: app.baseRamMb,
    cpuPct: 2.4 + index * 0.4,
    pid: 200 + index * 10,
  }));

  const storeWins: DesktopWindowState[] = APP_STORE_CATALOG.map((app, index) => ({
    id: app.id as DesktopAppId,
    title: app.name,
    subtitle: `${app.category} · ${app.packageFormat}`,
    platform: app.platform,
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    snapMode: 'free',
    workspaceId: 1,
    zIndex: 20 + index,
    x: 210 + index * 20,
    y: 50 + index * 18,
    width: 590,
    height: 390,
    ramMb: app.ramMb,
    cpuPct: 1.4,
    pid: 300 + index * 5,
  }));

  return [...base, ...legacyWins, ...storeWins];
}

export const DesktopSimulator: React.FC<DesktopSimulatorProps> = ({
  config,
  footprint,
  users,
  activeUser,
  polyFiles,
  folders,
  selectedPolyFileId,
  onSelectPolyFile,
  onAddPolyFile,
  onToggleTrashFile,
  onCreateFolder,
  onSaveNoteDocument,
  onUpdateConfig,
  onToggleWidget,
  onResizeWidget,
  onUpdateQuickNote,
  onInstallStoreApp,
  onUninstallStoreApp,
  onSwitchUser,
  onCreateUser,
  onExportZip,
  externalOpenRequest,
}) => {
  const [windows, setWindows] = useState<DesktopWindowState[]>(buildInitialWindows);
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([
    { id: 1, name: 'Área 1 · Principal' },
    { id: 2, name: 'Área 2 · Engenharia' },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number>(1);
  const [topZ, setTopZ] = useState(40);

  // Overlays & System States
  const [isLocked, setIsLocked] = useState(false);
  const [isImmersiveFullscreen, setIsImmersiveFullscreen] = useState(false);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [appGridOpen, setAppGridOpen] = useState(false);
  const [multitaskOpen, setMultitaskOpen] = useState(false);
  const [widgetPopoverOpen, setWidgetPopoverOpen] = useState(false);
  const [stageLayoutsOpen, setStageLayoutsOpen] = useState(false);
  const [dualBootPreviewOpen, setDualBootPreviewOpen] = useState(false);
  const [bootingSplash, setBootingSplash] = useState(false);
  const [startQuery, setStartQuery] = useState('');

  // Context Menu, Hover Live Preview, and Window Maximize Snap Picker
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoveredPreview, setHoveredPreview] = useState<{
    appId: DesktopAppId;
    anchorX: number;
  } | null>(null);
  const [hoveredMaximizeWinId, setHoveredMaximizeWinId] = useState<DesktopAppId | null>(null);

  const previewCloseTimerRef = useRef<number | null>(null);
  const maxHoverCloseTimerRef = useRef<number | null>(null);

  // Control Center states
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);
  const [volume, setVolume] = useState(74);
  const [brightness, setBrightness] = useState(100);
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  // Dragging & Free Window Resizing refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    id: DesktopAppId;
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeStateRef = useRef<{
    id: DesktopAppId;
    edge: 'e' | 'w' | 's' | 'se' | 'sw';
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockText(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (previewCloseTimerRef.current) window.clearTimeout(previewCloseTimerRef.current);
      if (maxHoverCloseTimerRef.current) window.clearTimeout(maxHoverCloseTimerRef.current);
    };
  }, []);

  const closeAllPopovers = () => {
    setStartMenuOpen(false);
    setControlCenterOpen(false);
    setWidgetPopoverOpen(false);
    setStageLayoutsOpen(false);
    setContextMenu(null);
    setHoveredMaximizeWinId(null);
  };

  const openOrFocusWindow = (id: DesktopAppId) => {
    setTopZ((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                isOpen: true,
                isMinimized: false,
                workspaceId: w.isOpen ? w.workspaceId : activeWorkspaceId,
                zIndex: nextZ,
              }
            : w
        )
      );
      return nextZ;
    });

    // If window is already open on another workspace, switch to that workspace smoothly
    const target = windows.find((w) => w.id === id);
    if (target?.isOpen && target.workspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(target.workspaceId);
    }

    closeAllPopovers();
    setAppGridOpen(false);
    setMultitaskOpen(false);
  };

  useEffect(() => {
    if (externalOpenRequest) {
      openOrFocusWindow(externalOpenRequest.appId);
    }
  }, [externalOpenRequest]);

  // Global shortcuts: Ctrl+Shift+Esc (Task Manager) & Escape (close overlays)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        openOrFocusWindow('taskmanager');
      } else if (e.key === 'Escape') {
        setAppGridOpen(false);
        setMultitaskOpen(false);
        setStartMenuOpen(false);
        setControlCenterOpen(false);
        setWidgetPopoverOpen(false);
        setStageLayoutsOpen(false);
        setContextMenu(null);
        setHoveredPreview(null);
        setHoveredMaximizeWinId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Mouse move/up for BOTH window dragging AND free window edge/corner resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();

      const drag = dragStateRef.current;
      if (drag) {
        const dx = e.clientX - drag.startMouseX;
        const dy = e.clientY - drag.startMouseY;
        const clampedX = Math.max(8, Math.min(bounds.width - 180, drag.origX + dx));
        const clampedY = Math.max(8, Math.min(bounds.height - 96, drag.origY + dy));

        setWindows((prev) =>
          prev.map((w) =>
            w.id === drag.id ? { ...w, x: clampedX, y: clampedY, snapMode: 'free' } : w
          )
        );
        return;
      }

      const resize = resizeStateRef.current;
      if (resize) {
        const dx = e.clientX - resize.startMouseX;
        const dy = e.clientY - resize.startMouseY;
        const minW = 300;
        const minH = 240;
        const maxW = Math.max(minW, bounds.width - 16);
        const maxH = Math.max(minH, bounds.height - 64);

        let nextX = resize.origX;
        let nextW = resize.origW;
        let nextH = resize.origH;

        if (resize.edge === 'e' || resize.edge === 'se') {
          nextW = Math.max(minW, Math.min(maxW - resize.origX, resize.origW + dx));
        }
        if (resize.edge === 'w' || resize.edge === 'sw') {
          const proposedW = Math.max(minW, Math.min(resize.origX + resize.origW - 8, resize.origW - dx));
          nextX = resize.origX + (resize.origW - proposedW);
          nextW = proposedW;
        }
        if (resize.edge === 's' || resize.edge === 'se' || resize.edge === 'sw') {
          nextH = Math.max(minH, Math.min(maxH, resize.origH + dy));
        }

        setWindows((prev) =>
          prev.map((w) =>
            w.id === resize.id
              ? {
                  ...w,
                  isMaximized: false,
                  snapMode: 'free',
                  x: Math.round(nextX),
                  width: Math.round(nextW),
                  height: Math.round(nextH),
                }
              : w
          )
        );
      }
    };
    const handleMouseUp = () => {
      dragStateRef.current = null;
      resizeStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const focusWindow = (id: DesktopAppId) => {
    setTopZ((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, zIndex: nextZ } : w))
      );
      return nextZ;
    });
  };

  const closeWindow = (id: DesktopAppId) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isOpen: false, isMaximized: false, snapMode: 'free' } : w
      )
    );
    setHoveredPreview((curr) => (curr?.appId === id ? null : curr));
  };

  const toggleMinimize = (id: DesktopAppId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  };

  const toggleMaximize = (id: DesktopAppId) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isMaximized: !w.isMaximized,
              snapMode: !w.isMaximized ? 'maximized' : 'free',
            }
          : w
      )
    );
  };

  const snapWindow = (id: DesktopAppId, side: 'left' | 'right') => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isOpen: true,
              isMinimized: false,
              isMaximized: false,
              snapMode: w.snapMode === side ? 'free' : side,
            }
          : w
      )
    );
    focusWindow(id);
  };

  const applyLayoutPreset = (preset: MultitaskLayoutPreset) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    const areaW = bounds ? bounds.width : 1040;
    const areaH = bounds ? bounds.height : 620;
    const isTopLayout =
      config.visual.paradigm === 'spatial-dock' || config.visual.paradigm === 'hybrid-aether';
    const topPad = isTopLayout ? 46 : 12;
    const bottomPad = config.visual.paradigm === 'classic-bottom' ? 60 : 76;
    const usableW = Math.max(420, areaW - 24);
    const usableH = Math.max(280, areaH - topPad - bottomPad);
    const gap = 10;

    setWindows((prev) => {
      let working = prev;
      let targets = working
        .filter((w) => w.isOpen && !w.isMinimized && w.workspaceId === activeWorkspaceId)
        .sort((a, b) => b.zIndex - a.zIndex);

      // If all windows in current workspace are minimized, restore them first
      if (targets.length === 0) {
        const minimizedInWs = working.filter(
          (w) => w.isOpen && w.isMinimized && w.workspaceId === activeWorkspaceId
        );
        if (minimizedInWs.length > 0) {
          working = working.map((w) =>
            w.isOpen && w.isMinimized && w.workspaceId === activeWorkspaceId
              ? { ...w, isMinimized: false }
              : w
          );
          targets = working
            .filter((w) => w.isOpen && !w.isMinimized && w.workspaceId === activeWorkspaceId)
            .sort((a, b) => b.zIndex - a.zIndex);
        } else {
          // Open Arquivos + AetherShell as a helpful starter pair if workspace is empty
          working = working.map((w) =>
            w.id === 'polyfs' || w.id === 'terminal'
              ? { ...w, isOpen: true, isMinimized: false, workspaceId: activeWorkspaceId }
              : w
          );
          targets = working
            .filter((w) => w.isOpen && !w.isMinimized && w.workspaceId === activeWorkspaceId)
            .sort((a, b) => b.zIndex - a.zIndex);
        }
      }

      const layoutMap = new Map<
        DesktopAppId,
        { x: number; y: number; w: number; h: number; zIndex?: number }
      >();

      const n = targets.length;

      if (preset === 'split-50') {
        const cols = n === 1 ? 1 : 2;
        const colW = Math.floor((usableW - gap * (cols - 1)) / cols);
        targets.forEach((win, idx) => {
          const col = idx % cols;
          const itemsInCol = Math.ceil((n - col) / cols);
          const row = Math.floor(idx / cols);
          const rowH = Math.floor((usableH - gap * (itemsInCol - 1)) / itemsInCol);
          layoutMap.set(win.id, {
            x: 12 + col * (colW + gap),
            y: topPad + row * (rowH + gap),
            w: colW,
            h: rowH,
          });
        });
      } else if (preset === 'master-stack') {
        if (n === 1) {
          layoutMap.set(targets[0].id, { x: 12, y: topPad, w: usableW, h: usableH });
        } else {
          const masterW = Math.floor((usableW - gap) * 0.6);
          const stackW = usableW - gap - masterW;
          layoutMap.set(targets[0].id, { x: 12, y: topPad, w: masterW, h: usableH });
          const stack = targets.slice(1);
          const itemH = Math.floor((usableH - gap * (stack.length - 1)) / stack.length);
          stack.forEach((win, idx) => {
            layoutMap.set(win.id, {
              x: 12 + masterW + gap,
              y: topPad + idx * (itemH + gap),
              w: stackW,
              h: itemH,
            });
          });
        }
      } else if (preset === 'three-cols') {
        const cols = Math.min(3, n);
        const colW = Math.floor((usableW - gap * (cols - 1)) / cols);
        targets.forEach((win, idx) => {
          const col = idx % cols;
          const itemsInCol = Math.ceil((n - col) / cols);
          const row = Math.floor(idx / cols);
          const rowH = Math.floor((usableH - gap * (itemsInCol - 1)) / itemsInCol);
          layoutMap.set(win.id, {
            x: 12 + col * (colW + gap),
            y: topPad + row * (rowH + gap),
            w: colW,
            h: rowH,
          });
        });
      } else if (preset === 'grid-2x2') {
        const cols = n <= 1 ? 1 : 2;
        const rows = Math.ceil(n / cols);
        const cellW = Math.floor((usableW - gap * (cols - 1)) / cols);
        const cellH = Math.floor((usableH - gap * (rows - 1)) / rows);
        targets.forEach((win, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const spanFull = idx === n - 1 && n % 2 === 1 && cols === 2;
          layoutMap.set(win.id, {
            x: 12 + col * (cellW + gap),
            y: topPad + row * (cellH + gap),
            w: spanFull ? usableW : cellW,
            h: cellH,
          });
        });
      } else if (preset === 'center-focus') {
        if (n === 1) {
          const centerW = Math.floor(usableW * 0.72);
          layoutMap.set(targets[0].id, {
            x: 12 + Math.floor((usableW - centerW) / 2),
            y: topPad,
            w: centerW,
            h: usableH,
          });
        } else if (n === 2) {
          const centerW = Math.floor((usableW - gap) * 0.62);
          const rightW = usableW - gap - centerW;
          layoutMap.set(targets[0].id, { x: 12, y: topPad, w: centerW, h: usableH });
          layoutMap.set(targets[1].id, {
            x: 12 + centerW + gap,
            y: topPad,
            w: rightW,
            h: usableH,
          });
        } else {
          const sideW = Math.floor((usableW - gap * 2) * 0.21);
          const centerW = usableW - gap * 2 - sideW * 2;
          layoutMap.set(targets[0].id, {
            x: 12 + sideW + gap,
            y: topPad,
            w: centerW,
            h: usableH,
          });
          const leftWins = targets.slice(1).filter((_, i) => i % 2 === 0);
          const rightWins = targets.slice(1).filter((_, i) => i % 2 === 1);
          const leftH = Math.floor((usableH - gap * (leftWins.length - 1)) / leftWins.length);
          const rightH = Math.floor((usableH - gap * (rightWins.length - 1)) / rightWins.length);
          leftWins.forEach((win, i) => {
            layoutMap.set(win.id, {
              x: 12,
              y: topPad + i * (leftH + gap),
              w: sideW,
              h: leftH,
            });
          });
          rightWins.forEach((win, i) => {
            layoutMap.set(win.id, {
              x: 12 + sideW + gap + centerW + gap,
              y: topPad + i * (rightH + gap),
              w: sideW,
              h: rightH,
            });
          });
        }
      } else {
        // cascade
        const winW = Math.min(640, Math.max(360, usableW - 110));
        const winH = Math.min(400, Math.max(260, usableH - 70));
        const ordered = [...targets].reverse();
        ordered.forEach((win, idx) => {
          layoutMap.set(win.id, {
            x: 24 + (idx % 6) * 34,
            y: topPad + 10 + (idx % 6) * 28,
            w: winW,
            h: winH,
            zIndex: 42 + idx,
          });
        });
      }

      return working.map((w) => {
        const rect = layoutMap.get(w.id);
        if (!rect) return w;
        return {
          ...w,
          isMaximized: false,
          snapMode: 'tiled',
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
          zIndex: rect.zIndex ?? w.zIndex,
        };
      });
    });
  };

  const addWorkspace = () => {
    const nextId = Math.max(...workspaces.map((w) => w.id)) + 1;
    setWorkspaces((prev) => [...prev, { id: nextId, name: `Área ${nextId}` }]);
    setActiveWorkspaceId(nextId);
  };

  const removeWorkspace = (wsId: number) => {
    if (workspaces.length <= 1) return;
    const fallback = workspaces.find((w) => w.id !== wsId)!.id;
    setWindows((prev) =>
      prev.map((w) => (w.workspaceId === wsId ? { ...w, workspaceId: fallback } : w))
    );
    setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
    if (activeWorkspaceId === wsId) {
      setActiveWorkspaceId(fallback);
    }
  };

  const moveWindowToWorkspace = (id: DesktopAppId, wsId: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, workspaceId: wsId } : w))
    );
  };

  const startDrag = (e: React.MouseEvent, win: DesktopWindowState) => {
    if (e.button !== 0) return;
    if (win.isMaximized) return;
    focusWindow(win.id);
    dragStateRef.current = {
      id: win.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
  };

  const startResize = (
    e: React.MouseEvent,
    win: DesktopWindowState,
    edge: 'e' | 'w' | 's' | 'se' | 'sw'
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    focusWindow(win.id);

    const bounds = containerRef.current?.getBoundingClientRect();
    const isTop =
      config.visual.paradigm === 'spatial-dock' || config.visual.paradigm === 'hybrid-aether';
    const topOffset = isTop ? 44 : 10;
    const bottomOffset = config.visual.paradigm === 'classic-bottom' ? 56 : 74;

    let currentX = win.x;
    let currentY = Math.max(topOffset, win.y);
    let currentW = win.width;
    let currentH = win.height;

    if (bounds) {
      if (win.snapMode === 'left') {
        currentX = 10;
        currentY = topOffset;
        currentW = Math.floor(bounds.width / 2 - 14);
        currentH = bounds.height - topOffset - bottomOffset;
      } else if (win.snapMode === 'right') {
        currentW = Math.floor(bounds.width / 2 - 14);
        currentX = bounds.width - currentW - 10;
        currentY = topOffset;
        currentH = bounds.height - topOffset - bottomOffset;
      }
    }

    resizeStateRef.current = {
      id: win.id,
      edge,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: currentX,
      origY: currentY,
      origW: currentW,
      origH: currentH,
    };
  };

  // Global Right-Click Context Menu Dispatcher
  const openContextMenu = (
    e: React.MouseEvent,
    header: string,
    items: ContextMenuItem[]
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setStartMenuOpen(false);
    setControlCenterOpen(false);
    setWidgetPopoverOpen(false);
    setStageLayoutsOpen(false);
    setHoveredPreview(null);
    setContextMenu({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      header,
      items,
    });
  };

  const cycleWallpaper = () => {
    const idx = WALLPAPERS.findIndex((w) => w.id === config.visual.wallpaperId);
    const next = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
    onUpdateConfig({
      ...config,
      visual: { ...config.visual, wallpaperId: next.id },
    });
  };

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    openContextMenu(e, `${config.visual.osName} · Área de Trabalho`, [
      {
        id: 'new-file',
        label: 'Abrir Arquivos / Nova Pasta',
        shortcut: 'PolyFS',
        onSelect: () => openOrFocusWindow('polyfs'),
      },
      {
        id: 'cycle-wallpaper',
        label: 'Trocar Papel de Parede',
        onSelect: cycleWallpaper,
      },
      {
        id: 'layout-split',
        label: 'Organizar: Lado a Lado (50/50)',
        dividerBefore: true,
        onSelect: () => applyLayoutPreset('split-50'),
      },
      {
        id: 'layout-master',
        label: 'Organizar: Mestre + Pilha (60/40)',
        onSelect: () => applyLayoutPreset('master-stack'),
      },
      {
        id: 'layout-grid',
        label: 'Organizar: Grade 2×2',
        onSelect: () => applyLayoutPreset('grid-2x2'),
      },
      {
        id: 'layout-cascade',
        label: 'Organizar: Cascata Fluida',
        onSelect: () => applyLayoutPreset('cascade'),
      },
      {
        id: 'widgets',
        label: 'Gerenciar Widgets',
        dividerBefore: true,
        onSelect: () => setWidgetPopoverOpen(true),
      },
      {
        id: 'settings',
        label: 'Configurações do Sistema',
        onSelect: () => openOrFocusWindow('settings'),
      },
      {
        id: 'lock',
        label: 'Bloquear Sessão / Trocar Conta',
        dividerBefore: true,
        onSelect: () => setIsLocked(true),
      },
    ]);
  };

  const handleWindowTitleContextMenu = (e: React.MouseEvent, win: DesktopWindowState) => {
    const nextWs = workspaces.find((ws) => ws.id !== win.workspaceId);
    openContextMenu(e, win.title, [
      {
        id: 'snap-left',
        label: 'Encaixar à Esquerda',
        onSelect: () => snapWindow(win.id, 'left'),
      },
      {
        id: 'snap-right',
        label: 'Encaixar à Direita',
        onSelect: () => snapWindow(win.id, 'right'),
      },
      {
        id: 'maximize',
        label: win.isMaximized ? 'Restaurar Tamanho' : 'Maximizar Janela',
        onSelect: () => toggleMaximize(win.id),
      },
      {
        id: 'minimize',
        label: 'Minimizar',
        onSelect: () => toggleMinimize(win.id),
      },
      ...(nextWs
        ? [
            {
              id: 'move-ws',
              label: `Mover para ${nextWs.name}`,
              dividerBefore: true,
              onSelect: () => moveWindowToWorkspace(win.id, nextWs.id),
            },
          ]
        : []),
      {
        id: 'close',
        label: 'Fechar Aplicativo',
        danger: true,
        dividerBefore: true,
        onSelect: () => closeWindow(win.id),
      },
    ]);
  };

  const handleTaskbarAppContextMenu = (
    e: React.MouseEvent,
    appId: DesktopAppId,
    label: string
  ) => {
    const win = windows.find((w) => w.id === appId);
    const isOpen = Boolean(win?.isOpen);
    openContextMenu(e, label, [
      {
        id: 'open-focus',
        label: !isOpen
          ? 'Abrir Aplicativo'
          : win?.isMinimized
            ? 'Restaurar Janela'
            : 'Focar Janela',
        onSelect: () => openOrFocusWindow(appId),
      },
      ...(isOpen
        ? [
            {
              id: 'minimize',
              label: win?.isMinimized ? 'Mostrar Janela' : 'Minimizar',
              onSelect: () => toggleMinimize(appId),
            },
            {
              id: 'snap-l',
              label: 'Encaixar à Esquerda',
              dividerBefore: true,
              onSelect: () => snapWindow(appId, 'left'),
            },
            {
              id: 'snap-r',
              label: 'Encaixar à Direita',
              onSelect: () => snapWindow(appId, 'right'),
            },
            {
              id: 'close',
              label: 'Fechar Aplicativo',
              danger: true,
              dividerBefore: true,
              onSelect: () => closeWindow(appId),
            },
          ]
        : []),
    ]);
  };

  // Taskbar / Dock Hover Live Preview Controllers
  const handleAppHoverEnter = (appId: DesktopAppId, targetEl: HTMLElement) => {
    if (config.visual.taskbarLivePreview === false) return;
    const win = windows.find((w) => w.id === appId);
    if (!win?.isOpen) return;
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    const containerBounds = containerRef.current?.getBoundingClientRect();
    const btnBounds = targetEl.getBoundingClientRect();
    if (!containerBounds) return;
    const anchorX = btnBounds.left - containerBounds.left + btnBounds.width / 2;
    setHoveredPreview({ appId, anchorX });
  };

  const handleAppHoverLeave = () => {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
    }
    previewCloseTimerRef.current = window.setTimeout(() => {
      setHoveredPreview(null);
    }, 180);
  };

  const cancelPreviewClose = () => {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  };

  const triggerBootSplash = () => {
    setDualBootPreviewOpen(false);
    setBootingSplash(true);
    window.setTimeout(() => {
      setBootingSplash(false);
    }, 950);
  };

  const activeWallpaper =
    WALLPAPERS.find((w) => w.id === config.visual.wallpaperId) ?? WALLPAPERS[0];

  const isLight = config.visual.desktopTheme === 'light';
  const lowRamFlat =
    config.visual.reduceTransparencyOnLowRam && config.operational.minRamMb <= 128;

  const effectiveBlur = lowRamFlat ? 4 : config.visual.glassBlurPx;
  const effectiveOpacity = lowRamFlat
    ? Math.max(0.88, config.visual.glassOpacity / 100)
    : config.visual.glassOpacity / 100;

  const glassStyle: React.CSSProperties = {
    backgroundColor: isLight
      ? `rgba(248, 250, 252, ${effectiveOpacity})`
      : `rgba(12, 18, 30, ${effectiveOpacity})`,
    backdropFilter: `blur(${effectiveBlur}px) saturate(140%)`,
    WebkitBackdropFilter: `blur(${effectiveBlur}px) saturate(140%)`,
    borderRadius: `${config.visual.borderRadiusPx}px`,
  };

  const barGlassStyle: React.CSSProperties = {
    backgroundColor: isLight
      ? `rgba(248, 250, 252, ${Math.min(0.92, effectiveOpacity + 0.08)})`
      : `rgba(11, 16, 27, ${Math.min(0.92, effectiveOpacity + 0.1)})`,
    backdropFilter: `blur(${effectiveBlur}px) saturate(145%)`,
    WebkitBackdropFilter: `blur(${effectiveBlur}px) saturate(145%)`,
  };

  const densityPad =
    config.visual.density === 'compact'
      ? 'py-1.5 px-2.5'
      : config.visual.density === 'comfortable'
        ? 'py-2.5 px-4'
        : 'py-2 px-3';

  const openWindows = useMemo(() => windows.filter((w) => w.isOpen), [windows]);
  const openWindowIds = useMemo(() => openWindows.map((w) => w.id), [openWindows]);
  const activeWsVisibleWindows = useMemo(
    () =>
      windows.filter(
        (w) => w.isOpen && !w.isMinimized && w.workspaceId === activeWorkspaceId
      ),
    [windows, activeWorkspaceId]
  );
  const activeAppRamMb = useMemo(
    () => openWindows.reduce((sum, w) => sum + w.ramMb, 0),
    [openWindows]
  );

  const pinnedApps: Array<{ id: DesktopAppId; label: string; icon: React.ReactNode }> = [
    { id: 'polyfs', label: 'Arquivos', icon: <FolderOpen className="h-4 w-4" /> },
    { id: 'appstore', label: 'Loja', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'browser', label: 'AetherWeb', icon: <Globe className="h-4 w-4" /> },
    { id: 'aethervmm', label: 'VMM', icon: <Layers className="h-4 w-4" /> },
    { id: 'terminal', label: 'Shell', icon: <Terminal className="h-4 w-4" /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings className="h-4 w-4" /> },
  ];

  const isTopBarLayout =
    config.visual.paradigm === 'spatial-dock' || config.visual.paradigm === 'hybrid-aether';

  const launcherItems = [
    { id: 'polyfs' as DesktopAppId, name: 'Arquivos e PolyFS', sub: 'Unidades, pastas e qualquer extensão' },
    { id: 'appstore' as DesktopAppId, name: 'AetherStore', sub: 'Loja de aplicativos nativos e legados' },
    { id: 'settings' as DesktopAppId, name: 'Configurações', sub: 'Aparência, contas, widgets e Docker' },
    { id: 'notes' as DesktopAppId, name: 'AetherNotes', sub: 'Editor nativo de notas e documentos' },
    { id: 'calc' as DesktopAppId, name: 'AetherCalc', sub: 'Calculadora DEC/HEX/BIN' },
    { id: 'media' as DesktopAppId, name: 'AetherMedia', sub: 'Galeria e visualizador nativo' },
    { id: 'browser' as DesktopAppId, name: 'AetherWeb', sub: 'Navegador e guia Docker' },
    { id: 'aethervmm' as DesktopAppId, name: 'AetherVMM', sub: 'Virtualizador multiplataforma' },
    { id: 'taskmanager' as DesktopAppId, name: 'Gerenciador de Tarefas', sub: 'Monitor Chronos (Ctrl+Shift+Esc)' },
    { id: 'terminal' as DesktopAppId, name: 'AetherShell', sub: 'Console nativo AetherLang' },
    ...APP_STORE_CATALOG.filter((s) => activeUser.installedStoreAppIds.includes(s.id)).map((s) => ({
      id: s.id as DesktopAppId,
      name: s.name,
      sub: `Instalado · ${s.packageFormat}`,
    })),
    ...LEGACY_APPS.map((l) => ({
      id: l.id as DesktopAppId,
      name: l.name,
      sub: `${l.platformLabel} · ${l.binaryName}`,
    })),
  ].filter(
    (item) =>
      item.name.toLowerCase().includes(startQuery.toLowerCase()) ||
      item.sub.toLowerCase().includes(startQuery.toLowerCase())
  );

  return (
    <div
      className={
        isImmersiveFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-[#070B12]'
          : 'flex h-full flex-col'
      }
    >
      {/* Workstation Stage Subbar (real simulator actions & workspace controls) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0E1420] px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-medium text-white">{config.visual.osName}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-300">{activeUser.displayName}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            Área {activeWorkspaceId}/{workspaces.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStageLayoutsOpen((o) => !o);
              setWidgetPopoverOpen(false);
              setStartMenuOpen(false);
              setControlCenterOpen(false);
              setContextMenu(null);
            }}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors ${
              stageLayoutsOpen
                ? 'border-sky-400/60 bg-sky-500/20 text-white'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/50 hover:text-white'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Layouts (6)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              closeAllPopovers();
              setMultitaskOpen((o) => !o);
              setAppGridOpen(false);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-400/50 hover:text-white whitespace-nowrap"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Multitarefa</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setWidgetPopoverOpen((o) => !o);
              setStartMenuOpen(false);
              setControlCenterOpen(false);
              setStageLayoutsOpen(false);
              setContextMenu(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-400/50 hover:text-white whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Widgets</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-400/50 hover:text-white whitespace-nowrap"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Trocar Usuário</span>
          </button>
          {config.operational.dualBootEnabled && (
            <button
              type="button"
              onClick={() => setDualBootPreviewOpen(true)}
              className="hidden sm:inline-flex rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-400/50 hover:text-white whitespace-nowrap"
            >
              Dual-Boot
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsImmersiveFullscreen((f) => !f)}
            className="inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-200 hover:bg-sky-500/25 whitespace-nowrap"
          >
            {isImmersiveFullscreen ? (
              <>
                <Shrink className="h-3.5 w-3.5" />
                <span>Voltar à Workstation</span>
              </>
            ) : (
              <>
                <Expand className="h-3.5 w-3.5" />
                <span>Tela Cheia do SO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Liquid Glass Desktop Viewport */}
      <div
        ref={containerRef}
        onClick={closeAllPopovers}
        onContextMenu={handleDesktopContextMenu}
        className={`relative flex-1 overflow-hidden select-none ${
          isLight ? 'text-slate-900' : 'text-slate-100'
        }`}
        style={{
          background: activeWallpaper.fallbackGradient,
          filter: `brightness(${brightness}%)`,
        }}
      >
        {/* High-res Generated Wallpaper */}
        <img
          src={activeWallpaper.imagePath}
          alt={activeWallpaper.name}
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className={`pointer-events-none absolute inset-0 ${
            isLight
              ? 'bg-gradient-to-b from-white/15 via-transparent to-black/15'
              : 'bg-gradient-to-b from-black/25 via-transparent to-black/45'
          }`}
        />

        {/* Desktop Widgets Layer (Resizable + Context Menu) */}
        <DesktopWidgetsLayer
          config={config}
          footprint={footprint}
          enabledWidgets={activeUser.enabledWidgets}
          widgetWidths={activeUser.widgetWidths ?? {}}
          quickNoteText={activeUser.quickNoteText}
          activeAppRamMb={activeAppRamMb}
          activeProcessCount={openWindows.length + 3}
          isTopBarLayout={isTopBarLayout}
          isLight={isLight}
          glassStyle={glassStyle}
          onUpdateQuickNote={onUpdateQuickNote}
          onResizeWidget={onResizeWidget}
          onHideWidget={onToggleWidget}
          onOpenWidgetContextMenu={openContextMenu}
          onOpenApp={openOrFocusWindow}
        />

        {/* Top Bar for Spatial Dock & Hybrid Aether */}
        {isTopBarLayout && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={barGlassStyle}
            className={`absolute inset-x-0 top-0 z-40 flex h-9 items-center justify-between border-b px-4 text-xs ${
              isLight ? 'border-slate-900/10' : 'border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setStartMenuOpen((o) => !o);
                  setControlCenterOpen(false);
                }}
                className="font-display font-semibold tracking-tight hover:opacity-80"
              >
                {config.visual.osName}
              </button>
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setAppGridOpen((o) => !o);
                  setMultitaskOpen(false);
                }}
                className="opacity-80 hover:opacity-100"
              >
                Aplicativos
              </button>
              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setMultitaskOpen((o) => !o);
                  setAppGridOpen(false);
                }}
                className="opacity-80 hover:opacity-100"
              >
                Áreas ({activeWorkspaceId}/{workspaces.length})
              </button>
              <button
                type="button"
                onClick={() => openOrFocusWindow('settings')}
                className="hidden sm:inline opacity-80 hover:opacity-100"
              >
                Configurações
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] hover:bg-white/10"
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-slate-950"
                  style={{ backgroundColor: activeUser.avatarColor }}
                >
                  {activeUser.initials}
                </span>
                <span className="hidden sm:inline">{activeUser.displayName}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setControlCenterOpen((o) => !o);
                  setStartMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10"
              >
                <Wifi className={`h-3.5 w-3.5 ${wifiOn ? '' : 'opacity-40'}`} />
                <Volume2 className="h-3.5 w-3.5" />
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px] tabular-nums">{clockText}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Desktop Shortcuts (Right side) */}
        <div
          className={`absolute right-4 z-10 hidden flex-col gap-2 sm:flex ${
            isTopBarLayout ? 'top-14' : 'top-4'
          }`}
        >
          {[
            { id: 'polyfs' as DesktopAppId, label: 'Arquivos' },
            { id: 'appstore' as DesktopAppId, label: 'AetherStore' },
            { id: 'notes' as DesktopAppId, label: 'AetherNotes' },
            { id: 'legacy-win32' as DesktopAppId, label: 'CadDraft.exe' },
            { id: 'browser' as DesktopAppId, label: 'Docker & Web' },
          ].map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openOrFocusWindow(shortcut.id);
              }}
              className="flex w-24 flex-col items-center gap-1 rounded-lg bg-black/25 p-2 text-center text-white backdrop-blur-md transition-transform hover:-translate-y-0.5 hover:bg-black/45"
            >
              {getAppIcon(shortcut.id, 'h-5 w-5')}
              <span className="w-full truncate text-[11px] font-medium drop-shadow">
                {shortcut.label}
              </span>
            </button>
          ))}
        </div>

        {/* Open Windows in Active Workspace (Animated with motion/react) */}
        <AnimatePresence>
          {activeWsVisibleWindows.map((win) => {
            const topOffset = isTopBarLayout ? 44 : 10;
            const bottomOffset = config.visual.paradigm === 'classic-bottom' ? 56 : 74;

            let windowFrameStyle: React.CSSProperties;
            if (win.isMaximized || win.snapMode === 'maximized') {
              windowFrameStyle = {
                ...glassStyle,
                top: `${topOffset}px`,
                left: '10px',
                right: '10px',
                bottom: `${bottomOffset}px`,
                zIndex: win.zIndex,
              };
            } else if (win.snapMode === 'left') {
              windowFrameStyle = {
                ...glassStyle,
                top: `${topOffset}px`,
                left: '10px',
                width: 'calc(50% - 14px)',
                bottom: `${bottomOffset}px`,
                zIndex: win.zIndex,
              };
            } else if (win.snapMode === 'right') {
              windowFrameStyle = {
                ...glassStyle,
                top: `${topOffset}px`,
                right: '10px',
                width: 'calc(50% - 14px)',
                bottom: `${bottomOffset}px`,
                zIndex: win.zIndex,
              };
            } else {
              windowFrameStyle = {
                ...glassStyle,
                top: `${Math.max(topOffset, win.y)}px`,
                left: `${win.x}px`,
                width: `min(${win.width}px, calc(100% - 24px))`,
                height: `min(${win.height}px, calc(100% - ${topOffset + bottomOffset + 12}px))`,
                zIndex: win.zIndex,
              };
            }

            const controlsBlock = (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapWindow(win.id, 'left');
                  }}
                  title="Encaixar à Esquerda"
                  className={`hidden sm:inline-flex rounded p-1 transition-colors ${
                    win.snapMode === 'left'
                      ? 'bg-sky-400/25 text-sky-300'
                      : isLight
                        ? 'hover:bg-slate-900/10'
                        : 'hover:bg-white/10'
                  }`}
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapWindow(win.id, 'right');
                  }}
                  title="Encaixar à Direita"
                  className={`hidden sm:inline-flex rounded p-1 transition-colors ${
                    win.snapMode === 'right'
                      ? 'bg-sky-400/25 text-sky-300'
                      : isLight
                        ? 'hover:bg-slate-900/10'
                        : 'hover:bg-white/10'
                  }`}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimize(win.id);
                  }}
                  title="Minimizar"
                  className={`rounded p-1 transition-colors ${
                    isLight ? 'hover:bg-slate-900/10' : 'hover:bg-white/10'
                  }`}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (maxHoverCloseTimerRef.current) {
                      window.clearTimeout(maxHoverCloseTimerRef.current);
                      maxHoverCloseTimerRef.current = null;
                    }
                    setHoveredMaximizeWinId(win.id);
                  }}
                  onMouseLeave={() => {
                    maxHoverCloseTimerRef.current = window.setTimeout(() => {
                      setHoveredMaximizeWinId((curr) => (curr === win.id ? null : curr));
                    }, 180);
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMaximize(win.id);
                    }}
                    title={win.isMaximized ? 'Restaurar (passe o mouse para layouts)' : 'Maximizar (passe o mouse para layouts)'}
                    className={`rounded p-1 transition-colors ${
                      isLight ? 'hover:bg-slate-900/10' : 'hover:bg-white/10'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {hoveredMaximizeWinId === win.id && (
                      <SnapLayoutsPopover
                        config={config}
                        isLight={isLight}
                        glassStyle={glassStyle}
                        onApplyPreset={(preset) => {
                          focusWindow(win.id);
                          applyLayoutPreset(preset);
                        }}
                        onClose={() => setHoveredMaximizeWinId(null)}
                        positionClass={
                          config.visual.windowControls === 'left'
                            ? 'left-0 top-7'
                            : 'right-0 top-7'
                        }
                      />
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(win.id);
                  }}
                  title="Fechar"
                  className="rounded p-1 transition-colors hover:bg-red-500/20 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );

            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={getMotionTransition(config.visual.animationProfile)}
                onMouseDown={() => focusWindow(win.id)}
                onClick={(e) => e.stopPropagation()}
                style={windowFrameStyle}
                className={`absolute flex flex-col border shadow-2xl ${
                  isLight ? 'border-slate-900/15' : 'border-white/15'
                }`}
              >
                {/* Titlebar (Draggable + Right-Click Context Menu) */}
                <div
                  onMouseDown={(e) => startDrag(e, win)}
                  onDoubleClick={() => toggleMaximize(win.id)}
                  onContextMenu={(e) => handleWindowTitleContextMenu(e, win)}
                  className={`flex cursor-grab items-center justify-between gap-3 border-b active:cursor-grabbing ${densityPad} ${
                    isLight ? 'border-slate-900/10' : 'border-white/10'
                  }`}
                >
                  {config.visual.windowControls === 'left' && controlsBlock}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="opacity-75 shrink-0">{getAppIcon(win.id, 'h-3.5 w-3.5')}</span>
                    <span className="truncate text-xs font-semibold">{win.title}</span>
                  </div>
                  {config.visual.windowControls === 'right' && controlsBlock}
                </div>

                {/* Window Body */}
                <div className="min-h-0 flex-1 overflow-hidden rounded-b-[inherit]">
                  {win.id === 'polyfs' && (
                    <FullFileManagerApp
                      config={config}
                      files={polyFiles}
                      folders={folders}
                      selectedFileId={selectedPolyFileId}
                      onSelectFile={onSelectPolyFile}
                      onAddFile={onAddPolyFile}
                      onToggleTrashFile={onToggleTrashFile}
                      onCreateFolder={onCreateFolder}
                      onLaunchApp={openOrFocusWindow}
                      onOpenContextMenu={openContextMenu}
                      isLight={isLight}
                    />
                  )}
                  {win.id === 'appstore' && (
                    <AppStoreApp
                      config={config}
                      installedIds={activeUser.installedStoreAppIds}
                      onInstallApp={onInstallStoreApp}
                      onUninstallApp={onUninstallStoreApp}
                      onLaunchApp={openOrFocusWindow}
                      isLight={isLight}
                    />
                  )}
                  {win.id === 'settings' && (
                    <OsSettingsApp
                      config={config}
                      footprint={footprint}
                      users={users}
                      activeUser={activeUser}
                      wifiOn={wifiOn}
                      btOn={btOn}
                      volume={volume}
                      brightness={brightness}
                      onSetWifi={setWifiOn}
                      onSetBt={setBtOn}
                      onSetVolume={setVolume}
                      onSetBrightness={setBrightness}
                      onUpdateConfig={onUpdateConfig}
                      onToggleWidget={onToggleWidget}
                      onResizeWidget={onResizeWidget}
                      onApplyLayoutPreset={applyLayoutPreset}
                      onSwitchUser={(uid) => {
                        onSwitchUser(uid);
                      }}
                      onLockScreen={() => setIsLocked(true)}
                      onCreateUser={onCreateUser}
                      onExportZip={onExportZip}
                      isLight={isLight}
                    />
                  )}
                  {win.id === 'notes' && (
                    <AetherNotesApp
                      config={config}
                      isLight={isLight}
                      onSaveDocument={onSaveNoteDocument}
                    />
                  )}
                  {win.id === 'calc' && <AetherCalcApp config={config} isLight={isLight} />}
                  {win.id === 'media' && (
                    <AetherMediaApp polyFiles={polyFiles} isLight={isLight} />
                  )}
                  {win.id === 'browser' && (
                    <AetherBrowserApp
                      config={config}
                      footprint={footprint}
                      isLight={isLight}
                      onExportZip={onExportZip}
                    />
                  )}
                  {win.id === 'aethervmm' && (
                    <AetherVmmApp
                      config={config}
                      openWindowIds={openWindowIds}
                      onLaunchLegacy={openOrFocusWindow}
                      isLight={isLight}
                    />
                  )}
                  {win.id === 'taskmanager' && (
                    <TaskManagerApp
                      config={config}
                      footprint={footprint}
                      windows={windows}
                      onKillWindow={closeWindow}
                      isLight={isLight}
                    />
                  )}
                  {win.id === 'terminal' && (
                    <AetherShellApp
                      config={config}
                      footprint={footprint}
                      activeAppCount={openWindows.length}
                    />
                  )}
                  {(win.id === 'legacy-win32' ||
                    win.id === 'legacy-android' ||
                    win.id === 'legacy-macos' ||
                    win.id === 'legacy-linux') && (
                    <LegacyAppWindowContent appId={win.id} config={config} isLight={isLight} />
                  )}
                  {win.id.startsWith('store-') && (
                    <InstalledStoreAppWindow appId={win.id} config={config} isLight={isLight} />
                  )}
                </div>

                {/* Free Window Resize Handles (Edges & Corners) */}
                {!win.isMaximized && (
                  <>
                    <div
                      onMouseDown={(e) => startResize(e, win, 'e')}
                      className="absolute bottom-3 right-0 top-10 w-1.5 cursor-ew-resize"
                    />
                    <div
                      onMouseDown={(e) => startResize(e, win, 'w')}
                      className="absolute bottom-3 left-0 top-10 w-1.5 cursor-ew-resize"
                    />
                    <div
                      onMouseDown={(e) => startResize(e, win, 's')}
                      className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize"
                    />
                    <div
                      onMouseDown={(e) => startResize(e, win, 'sw')}
                      className="absolute bottom-0 left-0 h-3.5 w-3.5 cursor-nesw-resize"
                    />
                    <div
                      onMouseDown={(e) => startResize(e, win, 'se')}
                      title="Arraste para redimensionar janela"
                      className="absolute bottom-0 right-0 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 opacity-45 hover:opacity-100"
                    >
                      <span
                        className={`h-2 w-2 border-b-2 border-r-2 ${
                          isLight ? 'border-slate-700' : 'border-slate-300'
                        }`}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Stage Subbar Auto-Layouts Popover */}
        <AnimatePresence>
          {stageLayoutsOpen && (
            <SnapLayoutsPopover
              config={config}
              isLight={isLight}
              glassStyle={glassStyle}
              onApplyPreset={applyLayoutPreset}
              onClose={() => setStageLayoutsOpen(false)}
              positionClass="right-4 top-2"
            />
          )}
        </AnimatePresence>

        {/* Global Right-Click Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <DesktopContextMenu
              menu={contextMenu}
              config={config}
              isLight={isLight}
              glassStyle={glassStyle}
              containerWidth={containerRef.current?.clientWidth ?? 1024}
              containerHeight={containerRef.current?.clientHeight ?? 620}
              onClose={() => setContextMenu(null)}
            />
          )}
        </AnimatePresence>

        {/* Taskbar / Dock Hover Live Preview Card */}
        <AnimatePresence>
          {hoveredPreview &&
            (() => {
              const previewWin = windows.find(
                (w) => w.id === hoveredPreview.appId && w.isOpen
              );
              if (!previewWin) return null;
              return (
                <TaskbarLivePreviewCard
                  win={previewWin}
                  anchorX={hoveredPreview.anchorX}
                  containerWidth={containerRef.current?.clientWidth ?? 1024}
                  config={config}
                  isLight={isLight}
                  glassStyle={glassStyle}
                  onFocus={() => {
                    openOrFocusWindow(previewWin.id);
                    setHoveredPreview(null);
                  }}
                  onSnap={(side) => {
                    snapWindow(previewWin.id, side);
                    setHoveredPreview(null);
                  }}
                  onCloseWin={() => {
                    closeWindow(previewWin.id);
                    setHoveredPreview(null);
                  }}
                  onMouseEnter={cancelPreviewClose}
                  onMouseLeave={handleAppHoverLeave}
                />
              );
            })()}
        </AnimatePresence>

        {/* Animated Start Menu / Universal Launcher */}
        <AnimatePresence>
          {startMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: isTopBarLayout ? -10 : 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isTopBarLayout ? -8 : 10, scale: 0.97 }}
              transition={getMotionTransition(config.visual.animationProfile)}
              onClick={(e) => e.stopPropagation()}
              style={glassStyle}
              className={`absolute z-50 w-[350px] max-w-[calc(100%-24px)] border p-4 shadow-2xl ${
                isLight ? 'border-slate-900/15' : 'border-white/15'
              } ${
                config.visual.paradigm === 'classic-bottom'
                  ? 'bottom-14 left-3'
                  : 'left-1/2 top-12 -translate-x-1/2'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                    style={{ backgroundColor: activeUser.avatarColor }}
                  >
                    {activeUser.initials}
                  </span>
                  <div>
                    <div className="font-display text-xs font-semibold">
                      {activeUser.displayName}
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {config.visual.osName} · {activeUser.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStartMenuOpen(false);
                      setIsLocked(true);
                    }}
                    title="Bloquear / Trocar Usuário"
                    className="rounded-md p-1.5 hover:bg-white/10"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartMenuOpen(false);
                      setDualBootPreviewOpen(true);
                    }}
                    title="Reiniciar / Dual-Boot"
                    className="rounded-md p-1.5 hover:bg-white/10"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
                <input
                  type="text"
                  value={startQuery}
                  onChange={(e) => setStartQuery(e.target.value)}
                  placeholder="Buscar aplicativos ou configurações..."
                  className={`w-full rounded-md border py-1.5 pl-8 pr-3 text-xs focus:border-sky-400 focus:outline-none ${
                    isLight
                      ? 'border-slate-900/15 bg-white/70'
                      : 'border-white/15 bg-black/30'
                  }`}
                />
              </div>

              <div className="max-h-56 space-y-1 overflow-y-auto">
                {launcherItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openOrFocusWindow(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                      isLight ? 'hover:bg-slate-900/10' : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="opacity-80 shrink-0">{getAppIcon(item.id, 'h-4 w-4')}</span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{item.name}</div>
                      <div
                        className={`truncate text-[11px] ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStartMenuOpen(false);
                    setAppGridOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300"
                >
                  <Grid className="h-3.5 w-3.5" />
                  <span>Ver Grade Completa</span>
                </button>
                <button
                  type="button"
                  onClick={() => openOrFocusWindow('settings')}
                  className="opacity-75 hover:opacity-100"
                >
                  Configurações
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Control Center */}
        <AnimatePresence>
          {controlCenterOpen && (
            <motion.div
              initial={{ opacity: 0, y: isTopBarLayout ? -10 : 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isTopBarLayout ? -8 : 10, scale: 0.97 }}
              transition={getMotionTransition(config.visual.animationProfile)}
              onClick={(e) => e.stopPropagation()}
              style={glassStyle}
              className={`absolute z-50 w-[300px] max-w-[calc(100%-24px)] border p-4 shadow-2xl ${
                isLight ? 'border-slate-900/15' : 'border-white/15'
              } ${
                config.visual.paradigm === 'classic-bottom'
                  ? 'bottom-14 right-3'
                  : 'right-3 top-12'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold">Central de Controle</span>
                <span className="font-mono text-[11px] tabular-nums opacity-70">
                  {footprint.totalIdleRamMb} MB Base
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWifiOn((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    wifiOn
                      ? 'border-transparent text-slate-950'
                      : isLight
                        ? 'border-slate-900/15 bg-white/40'
                        : 'border-white/10 bg-white/5'
                  }`}
                  style={wifiOn ? { backgroundColor: config.visual.accentColor } : undefined}
                >
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Wi-Fi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBtOn((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    btOn
                      ? 'border-transparent text-slate-950'
                      : isLight
                        ? 'border-slate-900/15 bg-white/40'
                        : 'border-white/10 bg-white/5'
                  }`}
                  style={btOn ? { backgroundColor: config.visual.accentColor } : undefined}
                >
                  <Bluetooth className="h-3.5 w-3.5" />
                  <span>Bluetooth</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      operational: {
                        ...config.operational,
                        minRamMb: config.operational.minRamMb <= 128 ? 512 : 128,
                        hardwareProfile:
                          config.operational.minRamMb <= 128 ? 'balanced-1gb' : 'legacy-128mb',
                      },
                    })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    config.operational.minRamMb <= 128
                      ? 'border-transparent text-slate-950'
                      : isLight
                        ? 'border-slate-900/15 bg-white/40'
                        : 'border-white/10 bg-white/5'
                  }`}
                  style={
                    config.operational.minRamMb <= 128
                      ? { backgroundColor: config.visual.accentColor }
                      : undefined
                  }
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Modo 128 MB</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      visual: {
                        ...config.visual,
                        desktopTheme: isLight ? 'dark' : 'light',
                      },
                    })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    isLight
                      ? 'border-slate-900/15 bg-white/60'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>{isLight ? 'Tema Claro' : 'Tema Escuro'}</span>
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Volume</span>
                    </span>
                    <span className="font-mono tabular-nums">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="aether-slider w-full"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5" />
                      <span>Brilho do Monitor</span>
                    </span>
                    <span className="font-mono tabular-nums">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={115}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="aether-slider w-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Widget Manager Popover */}
        <AnimatePresence>
          {widgetPopoverOpen && (
            <WidgetManagerPopover
              enabledWidgets={activeUser.enabledWidgets}
              isLight={isLight}
              glassStyle={glassStyle}
              isTopBarLayout={isTopBarLayout}
              onToggleWidget={onToggleWidget}
              onClose={() => setWidgetPopoverOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Animated App Grid Overlay */}
        <AnimatePresence>
          {appGridOpen && (
            <AppGridOverlay
              config={config}
              installedStoreIds={activeUser.installedStoreAppIds}
              isLight={isLight}
              onLaunch={openOrFocusWindow}
              onClose={() => setAppGridOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Animated Multitask & Workspaces Overview */}
        <AnimatePresence>
          {multitaskOpen && (
            <MultitaskOverviewOverlay
              config={config}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              windows={windows}
              isLight={isLight}
              onSelectWorkspace={(wsId) => setActiveWorkspaceId(wsId)}
              onAddWorkspace={addWorkspace}
              onRemoveWorkspace={removeWorkspace}
              onFocusWindow={openOrFocusWindow}
              onCloseWindow={closeWindow}
              onMoveWindowToWorkspace={moveWindowToWorkspace}
              onApplyLayoutPreset={applyLayoutPreset}
              onClose={() => setMultitaskOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Dual-Boot Preview Modal */}
        <AnimatePresence>
          {dualBootPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 z-50 flex items-center justify-center bg-[#060910]/95 p-6 text-slate-100 backdrop-blur-md"
            >
              <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0F172A] p-6">
                <div className="font-mono text-xs text-sky-400">AetherBoot Stage-2 · Dual-Boot</div>
                <h3 className="mt-1 font-display text-lg font-semibold">
                  Selecione o Sistema Operacional
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Coexistência segura sem formatar partições existentes · TPM 2.0{' '}
                  {config.operational.bypassTpm2 ? 'dispensado' : 'verificado'}.
                </p>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={triggerBootSplash}
                    className="flex w-full items-center justify-between rounded-lg border border-sky-400/60 bg-sky-500/15 px-4 py-3 text-left transition-colors hover:bg-sky-500/25"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {config.visual.osName} {config.visual.osVersion} ({config.visual.codename})
                      </div>
                      <div className="text-xs text-slate-300">
                        Microkernel Chronos · Partição PolyFS · Alvo {config.operational.minRamMb} MB
                      </div>
                    </div>
                    <span className="font-mono text-xs text-sky-300">Iniciar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDualBootPreviewOpen(false)}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-white/25"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Instalação Existente (Windows / macOS / Linux)
                      </div>
                      <div className="text-xs text-slate-400">
                        Chainload preservado · Arquivos do usuário intactos
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-400">Voltar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Chronos Boot Splash */}
        <AnimatePresence>
          {bootingSplash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-[#060910] text-slate-100"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={getMotionTransition(config.visual.animationProfile)}
                className="flex flex-col items-center"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-slate-950 shadow-2xl"
                  style={{ backgroundColor: config.visual.accentColor }}
                >
                  {config.visual.osName.slice(0, 2).toUpperCase()}
                </div>
                <div className="mt-4 font-display text-lg font-semibold tracking-tight">
                  {config.visual.osName} {config.visual.osVersion}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-400">
                  Chronos Microkernel · PolyFS · LumenWM
                </div>
                <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: config.visual.accentColor }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated OS Lock / Login Screen */}
        <AnimatePresence>
          {isLocked && (
            <OsLoginScreen
              users={users}
              activeUserId={activeUser.id}
              osName={config.visual.osName}
              onUnlockUser={(uid) => {
                onSwitchUser(uid);
                setIsLocked(false);
              }}
              onCreateUser={onCreateUser}
            />
          )}
        </AnimatePresence>

        {/* Bottom Taskbar (Classic Bottom) OR Floating Dock (Spatial / Hybrid) */}
        {config.visual.paradigm === 'classic-bottom' ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={barGlassStyle}
            className={`absolute inset-x-0 bottom-0 z-40 flex h-12 items-center justify-between border-t px-3 ${
              isLight ? 'border-slate-900/12' : 'border-white/12'
            }`}
          >
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setStartMenuOpen((o) => !o);
                  setControlCenterOpen(false);
                  setWidgetPopoverOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0"
                style={{ backgroundColor: config.visual.accentColor }}
              >
                <span>{config.visual.osName}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeAllPopovers();
                  setAppGridOpen((o) => !o);
                  setMultitaskOpen(false);
                }}
                title="Grade de Aplicativos"
                className={`rounded-lg p-2 transition-colors ${
                  appGridOpen
                    ? 'bg-sky-500/25 text-sky-300'
                    : isLight
                      ? 'hover:bg-slate-900/10'
                      : 'hover:bg-white/10'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>

              {/* Quick Workspace Switcher */}
              <div className="mx-1 hidden items-center gap-0.5 rounded-md bg-black/20 p-0.5 md:flex">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => setActiveWorkspaceId(ws.id)}
                    className={`rounded px-2 py-1 font-mono text-[11px] tabular-nums transition-colors ${
                      ws.id === activeWorkspaceId
                        ? 'text-slate-950 font-semibold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={
                      ws.id === activeWorkspaceId
                        ? { backgroundColor: config.visual.accentColor }
                        : undefined
                    }
                  >
                    {ws.id}
                  </button>
                ))}
              </div>

              <div className="mx-1 h-5 w-px bg-white/15" />

              {pinnedApps.map((app) => {
                const win = windows.find((w) => w.id === app.id);
                const isRunning = Boolean(win?.isOpen);
                const motionEnabled = config.visual.animationProfile !== 'reduced';
                return (
                  <motion.button
                    key={app.id}
                    type="button"
                    whileHover={motionEnabled ? { y: -2 } : undefined}
                    whileTap={motionEnabled ? { scale: 0.96 } : undefined}
                    onClick={() => {
                      openOrFocusWindow(app.id);
                      setHoveredPreview(null);
                    }}
                    onMouseEnter={(e) => handleAppHoverEnter(app.id, e.currentTarget)}
                    onMouseLeave={handleAppHoverLeave}
                    onContextMenu={(e) => handleTaskbarAppContextMenu(e, app.id, app.label)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isRunning
                        ? isLight
                          ? 'bg-slate-900/12'
                          : 'bg-white/14'
                        : isLight
                          ? 'hover:bg-slate-900/8'
                          : 'hover:bg-white/8'
                    }`}
                  >
                    {app.icon}
                    <span className="hidden lg:inline">{app.label}</span>
                    {isRunning && (
                      <span
                        className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: config.visual.accentColor }}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* Open Extra Windows (Legacy / Store / Utilities) */}
              {openWindows
                .filter((w) => !pinnedApps.some((p) => p.id === w.id))
                .map((ew) => {
                  const motionEnabled = config.visual.animationProfile !== 'reduced';
                  return (
                    <motion.button
                      key={ew.id}
                      type="button"
                      whileHover={motionEnabled ? { y: -2 } : undefined}
                      whileTap={motionEnabled ? { scale: 0.96 } : undefined}
                      onClick={() => {
                        openOrFocusWindow(ew.id);
                        setHoveredPreview(null);
                      }}
                      onMouseEnter={(e) => handleAppHoverEnter(ew.id, e.currentTarget)}
                      onMouseLeave={handleAppHoverLeave}
                      onContextMenu={(e) => handleTaskbarAppContextMenu(e, ew.id, ew.title)}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                        isLight ? 'bg-slate-900/12' : 'bg-white/14'
                      }`}
                    >
                      {getAppIcon(ew.id, 'h-3.5 w-3.5')}
                      <span className="max-w-[96px] truncate">{ew.title.split(' ')[0]}</span>
                      <span
                        className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: config.visual.accentColor }}
                      />
                    </motion.button>
                  );
                })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openOrFocusWindow('taskmanager')}
                title="Gerenciador de Tarefas (Ctrl+Shift+Esc)"
                className="hidden sm:inline-flex rounded-lg p-1.5 hover:bg-white/10"
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setControlCenterOpen((o) => !o);
                  setStartMenuOpen(false);
                  setWidgetPopoverOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  isLight ? 'hover:bg-slate-900/10' : 'hover:bg-white/10'
                }`}
              >
                <Wifi className={`h-3.5 w-3.5 ${wifiOn ? '' : 'opacity-40'}`} />
                <Volume2 className="h-3.5 w-3.5" />
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px] tabular-nums">{clockText}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Floating Liquid Glass Dock */
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...barGlassStyle,
              borderRadius: `${Math.max(12, config.visual.borderRadiusPx)}px`,
            }}
            className={`absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 border px-2.5 py-2 shadow-2xl ${
              isLight ? 'border-slate-900/15' : 'border-white/15'
            }`}
          >
            <motion.button
              type="button"
              whileHover={config.visual.animationProfile !== 'reduced' ? { y: -3, scale: 1.06 } : undefined}
              whileTap={config.visual.animationProfile !== 'reduced' ? { scale: 0.95 } : undefined}
              onClick={() => {
                closeAllPopovers();
                setAppGridOpen((o) => !o);
                setMultitaskOpen(false);
              }}
              title="Grade de Aplicativos"
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <Grid className="h-4 w-4" />
            </motion.button>

            <div className="mx-0.5 h-5 w-px bg-white/15" />

            {pinnedApps.map((app) => {
              const isRunning = openWindowIds.includes(app.id);
              const motionEnabled = config.visual.animationProfile !== 'reduced';
              return (
                <motion.button
                  key={app.id}
                  type="button"
                  whileHover={motionEnabled ? { y: -3, scale: 1.05 } : undefined}
                  whileTap={motionEnabled ? { scale: 0.95 } : undefined}
                  onClick={() => {
                    openOrFocusWindow(app.id);
                    setHoveredPreview(null);
                  }}
                  onMouseEnter={(e) => handleAppHoverEnter(app.id, e.currentTarget)}
                  onMouseLeave={handleAppHoverLeave}
                  onContextMenu={(e) => handleTaskbarAppContextMenu(e, app.id, app.label)}
                  title={app.label}
                  className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap ${
                    isRunning
                      ? isLight
                        ? 'bg-slate-900/12'
                        : 'bg-white/15'
                      : isLight
                        ? 'hover:bg-slate-900/8'
                        : 'hover:bg-white/10'
                  }`}
                >
                  {app.icon}
                  <span className="hidden xl:inline">{app.label}</span>
                  {isRunning && (
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: config.visual.accentColor }}
                    />
                  )}
                </motion.button>
              );
            })}

            {openWindows
              .filter((w) => !pinnedApps.some((p) => p.id === w.id))
              .map((ew) => {
                const motionEnabled = config.visual.animationProfile !== 'reduced';
                return (
                  <motion.button
                    key={ew.id}
                    type="button"
                    whileHover={motionEnabled ? { y: -3, scale: 1.05 } : undefined}
                    whileTap={motionEnabled ? { scale: 0.95 } : undefined}
                    onClick={() => {
                      openOrFocusWindow(ew.id);
                      setHoveredPreview(null);
                    }}
                    onMouseEnter={(e) => handleAppHoverEnter(ew.id, e.currentTarget)}
                    onMouseLeave={handleAppHoverLeave}
                    onContextMenu={(e) => handleTaskbarAppContextMenu(e, ew.id, ew.title)}
                    title={ew.title}
                    className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap ${
                      isLight ? 'bg-slate-900/12' : 'bg-white/15'
                    }`}
                  >
                    {getAppIcon(ew.id, 'h-4 w-4')}
                    <span
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: config.visual.accentColor }}
                    />
                  </motion.button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
