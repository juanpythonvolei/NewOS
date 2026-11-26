export type ErgonomicParadigm = 'classic-bottom' | 'spatial-dock' | 'hybrid-aether';
export type DesktopThemeMode = 'dark' | 'light';
export type UiDensity = 'compact' | 'standard' | 'comfortable';
export type WindowControlSide = 'right' | 'left';
export type AnimationProfile = 'fluid' | 'snappy' | 'reduced';
export type MultitaskLayoutPreset =
  | 'split-50'
  | 'master-stack'
  | 'three-cols'
  | 'grid-2x2'
  | 'center-focus'
  | 'cascade';
export type WidgetScale = 'compact' | 'standard' | 'wide';

export type HardwareProfileId = 'legacy-128mb' | 'balanced-1gb' | 'workstation-4gb' | 'custom';
export type SchedulerPolicy = 'chronos-deterministic' | 'hybrid-cooperative' | 'realtime-strict';

export type MemorySafetyModel = 'linear-ownership' | 'deterministic-rc' | 'static-arena';
export type CompilerOptimization = 'size-min' | 'balanced' | 'max-perf';
export type SandboxPolicy = 'strict-capability' | 'balanced-user' | 'direct-inspect';

export type WorkstationView = 'desktop' | 'language' | 'compat' | 'build';

export interface VisualMetrics {
  osName: string;
  osVersion: string;
  codename: string;
  paradigm: ErgonomicParadigm;
  desktopTheme: DesktopThemeMode;
  wallpaperId: string;
  glassOpacity: number; // 40 to 92 (%)
  glassBlurPx: number; // 4 to 32 (px)
  borderRadiusPx: number; // 0 to 24 (px)
  accentColor: string;
  density: UiDensity;
  windowControls: WindowControlSide;
  reduceTransparencyOnLowRam: boolean;
  animationProfile: AnimationProfile;
  taskbarLivePreview: boolean;
}

export interface OperationalMetrics {
  hardwareProfile: HardwareProfileId;
  minRamMb: number; // 128 to 8192
  schedulerPolicy: SchedulerPolicy;
  cpuQuantumMs: number; // 1 to 20
  memoryCompression: boolean;
  bypassTpm2: boolean;
  bypassSecureBoot: boolean;
  legacyCpuFallback: boolean; // Run without SSE4.2 / POPCNT
  dualBootEnabled: boolean;
  dualBootDefaultOs: 'aether' | 'existing';
}

export interface LanguageMetrics {
  memoryModel: MemorySafetyModel;
  optimization: CompilerOptimization;
  strictCapabilities: boolean;
  emitAbiDocs: boolean;
}

export interface LegacyBridgeConfig {
  enabled: boolean;
  maxRamMb: number;
  gpuAcceleration: boolean;
  networkIsolated: boolean;
}

export interface CompatMetrics {
  sandboxPolicy: SandboxPolicy;
  universalCodecAutoDecode: boolean;
  bridges: {
    win32: LegacyBridgeConfig;
    android: LegacyBridgeConfig;
    macos: LegacyBridgeConfig;
    linux: LegacyBridgeConfig;
  };
}

export interface AetherConfig {
  visual: VisualMetrics;
  operational: OperationalMetrics;
  language: LanguageMetrics;
  compat: CompatMetrics;
}

export interface SavedProfile {
  id: string;
  name: string;
  savedAt: string;
  config: AetherConfig;
}

export interface WallpaperOption {
  id: string;
  name: string;
  subtitle: string;
  imagePath: string;
  fallbackGradient: string;
}

export type LegacyPlatform = 'win32' | 'android' | 'macos' | 'linux' | 'aether';

export type StorageDriveId = 'drive-aether' | 'drive-dualboot' | 'drive-vault' | 'drive-usb';

export interface StorageDrive {
  id: StorageDriveId;
  letter: string;
  label: string;
  filesystem: string;
  totalGb: number;
  usedGb: number;
  mountPath: string;
  readOnly?: boolean;
}

export interface FileFolder {
  id: string;
  name: string;
  driveId: StorageDriveId;
  system?: boolean;
}

export interface PolyFileEntry {
  id: string;
  name: string;
  extension: string;
  originOs: string;
  platform: LegacyPlatform;
  category: 'executable' | 'document' | 'media' | 'archive' | 'source' | 'design';
  sizeBytes: number;
  magicHex: string;
  decoder: string;
  summary: string;
  previewText?: string;
  previewImageUrl?: string;
  isUserUploaded?: boolean;
  launchableAppId?: string;
  driveId?: StorageDriveId;
  folderId?: string;
  ownerUserId?: string;
  isTrashed?: boolean;
}

export interface LegacyAppTemplate {
  id: string;
  name: string;
  binaryName: string;
  platform: Exclude<LegacyPlatform, 'aether'>;
  platformLabel: string;
  abiBridge: string;
  baseRamMb: number;
  description: string;
  syscallSamples: Array<{ legacy: string; aether: string; latencyUs: number }>;
}

export type WidgetId = 'clock' | 'telemetry' | 'quick-notes' | 'storage' | 'vmm-dock';

export interface OsUserAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'Administrador' | 'Padrão' | 'Convidado';
  pin: string;
  avatarColor: string;
  initials: string;
  config: AetherConfig;
  enabledWidgets: WidgetId[];
  widgetWidths?: Partial<Record<WidgetId, number>>;
  quickNoteText: string;
  installedStoreAppIds: string[];
  createdAt: string;
}

export interface StoreAppEntry {
  id: string;
  name: string;
  developer: string;
  category: 'Produtividade' | 'Desenvolvimento' | 'Mídia e Design' | 'Sistema e Rede';
  platform: LegacyPlatform;
  packageFormat: string;
  sizeMb: number;
  ramMb: number;
  capabilities: string[];
  summary: string;
}

export type DesktopAppId =
  | 'polyfs'
  | 'aethervmm'
  | 'taskmanager'
  | 'terminal'
  | 'appstore'
  | 'settings'
  | 'notes'
  | 'calc'
  | 'media'
  | 'browser'
  | 'legacy-win32'
  | 'legacy-android'
  | 'legacy-macos'
  | 'legacy-linux'
  | 'store-aethercode'
  | 'store-sonicwave'
  | 'store-vectorsketch'
  | 'store-aethermail'
  | 'store-netscope'
  | 'store-retrobox';

export type WindowSnapMode = 'free' | 'left' | 'right' | 'maximized' | 'tiled';

export interface WorkspaceInfo {
  id: number;
  name: string;
}

export interface DesktopWindowState {
  id: DesktopAppId;
  title: string;
  subtitle: string;
  platform: LegacyPlatform;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  snapMode: WindowSnapMode;
  workspaceId: number;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ramMb: number;
  cpuPct: number;
  pid: number;
}

export interface GeneratedSourceFile {
  path: string;
  folder: string;
  language: 'aether' | 'asm' | 'toml' | 'makefile' | 'bash' | 'json' | 'markdown';
  description: string;
  content: string;
}

export interface BuildCheckItem {
  id: string;
  title: string;
  status: 'nominal' | 'warning' | 'error';
  detail: string;
}

export interface SystemFootprint {
  kernelRamMb: number;
  compositorRamMb: number;
  polyfsRamMb: number;
  activeBridgesOverheadMb: number;
  totalIdleRamMb: number;
  isoSizeMb: number;
  bootTimeMs: number;
  runsOn128Mb: boolean;
  legacyHardwareReady: boolean;
}
