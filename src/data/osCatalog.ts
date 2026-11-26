import {
  FileFolder,
  OsUserAccount,
  StorageDrive,
  StoreAppEntry,
  WidgetId,
} from '../types/aether';
import { DEFAULT_CONFIG, QUICK_PRESETS } from './presets';

export const STORAGE_DRIVES: StorageDrive[] = [
  {
    id: 'drive-aether',
    letter: 'A:',
    label: 'AetherNVMe',
    filesystem: 'PolyFS Nativo',
    totalGb: 256,
    usedGb: 42,
    mountPath: '/poly/root',
  },
  {
    id: 'drive-dualboot',
    letter: 'W:',
    label: 'DualBoot_Win',
    filesystem: 'NTFS (Ponte Segura)',
    totalGb: 512,
    usedGb: 298,
    mountPath: '/poly/mount/win_ntfs',
    readOnly: false,
  },
  {
    id: 'drive-vault',
    letter: 'V:',
    label: 'Cofre Criptografado',
    filesystem: 'AetherVault AES-256',
    totalGb: 128,
    usedGb: 19,
    mountPath: '/poly/vault',
  },
  {
    id: 'drive-usb',
    letter: 'U:',
    label: 'Disco Removível USB',
    filesystem: 'exFAT / Universal',
    totalGb: 32,
    usedGb: 8,
    mountPath: '/poly/media/usb0',
  },
];

export const INITIAL_FOLDERS: FileFolder[] = [
  { id: 'folder-home', name: 'Início', driveId: 'drive-aether', system: true },
  { id: 'folder-docs', name: 'Documentos', driveId: 'drive-aether', system: true },
  { id: 'folder-code', name: 'Projetos AetherLang', driveId: 'drive-aether', system: true },
  { id: 'folder-apps', name: 'Apps Legados', driveId: 'drive-dualboot', system: true },
  { id: 'folder-design', name: 'Mídia e Design', driveId: 'drive-vault', system: true },
  { id: 'folder-downloads', name: 'Downloads', driveId: 'drive-usb', system: true },
  { id: 'folder-trash', name: 'Lixeira', driveId: 'drive-aether', system: true },
];

export const WIDGET_CATALOG: Array<{
  id: WidgetId;
  name: string;
  description: string;
}> = [
  {
    id: 'clock',
    name: 'Relógio e Calendário',
    description: 'Hora em tempo real e data completa em vidro translúcido.',
  },
  {
    id: 'telemetry',
    name: 'Monitor Chronos',
    description: 'Consumo ao vivo de RAM, escalonador e tarefas abertas.',
  },
  {
    id: 'quick-notes',
    name: 'Notas Rápidas',
    description: 'Bloco editável fixo na área de trabalho salvo por usuário.',
  },
  {
    id: 'storage',
    name: 'Unidades de Armazenamento',
    description: 'Resumo de espaço das partições AetherNVMe, DualBoot e Cofre.',
  },
  {
    id: 'vmm-dock',
    name: 'Lançador Rápido VMM',
    description: 'Acesso imediato para abrir binários Windows, Android, macOS e Linux.',
  },
];

export const APP_STORE_CATALOG: StoreAppEntry[] = [
  {
    id: 'store-aethercode',
    name: 'AetherCode Studio',
    developer: 'Aether Foundation',
    category: 'Desenvolvimento',
    platform: 'aether',
    packageFormat: '.aethpkg (Nativo)',
    sizeMb: 18,
    ramMb: 26,
    capabilities: ['PolyFS.ReadWrite', 'AethC.Invoke'],
    summary: 'Editor nativo leve para projetos AetherLang com compilação instantânea e inspetor de capabilities.',
  },
  {
    id: 'store-sonicwave',
    name: 'SonicWave Audio',
    developer: 'Lumen Labs',
    category: 'Mídia e Design',
    platform: 'aether',
    packageFormat: '.aethpkg (Nativo)',
    sizeMb: 14,
    ramMb: 22,
    capabilities: ['AudioHDA.Stream', 'PolyFS.ReadMedia'],
    summary: 'Estação de reprodução lossless (FLAC, WAV, MP3, OGG) com equalizador de baixa latência.',
  },
  {
    id: 'store-vectorsketch',
    name: 'VectorSketch Pro',
    developer: 'Nordic Canvas',
    category: 'Mídia e Design',
    platform: 'macos',
    packageFormat: '.dmg → AetherVMM',
    sizeMb: 64,
    ramMb: 44,
    capabilities: ['GPUCap.Vector2D', 'PolyFS.Export'],
    summary: 'Prancheta vetorial com camadas e exportação SVG executando nativamente pela ponte Mach-O.',
  },
  {
    id: 'store-aethermail',
    name: 'AetherMail & Agenda',
    developer: 'Aether Foundation',
    category: 'Produtividade',
    platform: 'aether',
    packageFormat: '.aethpkg (Nativo)',
    sizeMb: 11,
    ramMb: 19,
    capabilities: ['AetherNet.TLS', 'Vault.Sign'],
    summary: 'Cliente unificado de mensagens e compromissos com criptografia local pelo AetherVault.',
  },
  {
    id: 'store-netscope',
    name: 'NetScope Monitor',
    developer: 'Chronos Systems',
    category: 'Sistema e Rede',
    platform: 'linux',
    packageFormat: '.AppImage → AetherVMM',
    sizeMb: 21,
    ramMb: 24,
    capabilities: ['AetherNet.Inspect', 'Chronos.Stats'],
    summary: 'Analisador de pacotes, latência de canais IPC e firewall por capability para redes locais.',
  },
  {
    id: 'store-retrobox',
    name: 'RetroBox Engine',
    developer: 'OpenArc Studio',
    category: 'Mídia e Design',
    platform: 'win32',
    packageFormat: '.exe → AetherVMM',
    sizeMb: 38,
    ramMb: 48,
    capabilities: ['GPUCap.FrameBuffer', 'UsbHid.Gamepad'],
    summary: 'Executa títulos clássicos Win32 e consoles retrô com aceleração de quadro no compositor LumenWM.',
  },
];

const legacyPreset = QUICK_PRESETS.find((p) => p.id === 'legacy-128mb')?.config ?? DEFAULT_CONFIG;
const spatialPreset = QUICK_PRESETS.find((p) => p.id === 'spatial-dock')?.config ?? DEFAULT_CONFIG;

export const MULTITASK_LAYOUT_PRESETS: Array<{
  id: 'split-50' | 'master-stack' | 'three-cols' | 'grid-2x2' | 'center-focus' | 'cascade';
  name: string;
  description: string;
}> = [
  {
    id: 'split-50',
    name: 'Lado a Lado (50/50)',
    description: 'Duas janelas dividindo a tela igualmente.',
  },
  {
    id: 'master-stack',
    name: 'Mestre + Pilha (60/40)',
    description: 'App principal em 60% e auxiliares empilhados à direita.',
  },
  {
    id: 'three-cols',
    name: 'Três Colunas (33/33/33)',
    description: 'Três painéis verticais paralelos.',
  },
  {
    id: 'grid-2x2',
    name: 'Grade 2×2 (4 Quadrantes)',
    description: 'Quatro quadrantes simétricos para multitarefa intensa.',
  },
  {
    id: 'center-focus',
    name: 'Foco Central (20/60/20)',
    description: 'Janela principal centralizada com duas barras laterais.',
  },
  {
    id: 'cascade',
    name: 'Cascata Dinâmica',
    description: 'Empilhamento diagonal com todas as barras visíveis.',
  },
];

export const DEFAULT_OS_USERS: OsUserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    displayName: 'Arquiteto Principal',
    role: 'Administrador',
    pin: '1234',
    avatarColor: '#38BDF8',
    initials: 'AP',
    config: DEFAULT_CONFIG,
    enabledWidgets: ['clock', 'telemetry', 'quick-notes'],
    widgetWidths: { clock: 252, telemetry: 252, 'quick-notes': 252, storage: 252, 'vmm-dock': 252 },
    quickNoteText:
      'Checklist AetherOS:\n• Testar 6 layouts de multitarefa\n• Usar botão direito no desktop e arquivos\n• Baixar kit de compilação da ISO',
    installedStoreAppIds: ['store-aethercode', 'store-aethermail'],
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 'user-studio',
    username: 'estudio',
    displayName: 'Estúdio Criativo',
    role: 'Padrão',
    pin: '2026',
    avatarColor: '#60A5FA',
    initials: 'EC',
    config: spatialPreset,
    enabledWidgets: ['clock', 'storage', 'vmm-dock'],
    widgetWidths: { clock: 260, telemetry: 260, 'quick-notes': 260, storage: 260, 'vmm-dock': 260 },
    quickNoteText:
      'Fluxo criativo:\n• Abrir Iconografia_Lumen.psd no PolyFS\n• Rodar StudioVector.dmg via AetherVMM',
    installedStoreAppIds: ['store-vectorsketch', 'store-sonicwave'],
    createdAt: '2026-11-21T14:30:00Z',
  },
  {
    id: 'user-legacy',
    username: 'legado',
    displayName: 'Perfil PC Legado',
    role: 'Convidado',
    pin: '0000',
    avatarColor: '#34D399',
    initials: 'PL',
    config: {
      ...legacyPreset,
      visual: {
        ...legacyPreset.visual,
        animationProfile: 'reduced',
      },
    },
    enabledWidgets: ['clock', 'telemetry'],
    widgetWidths: { clock: 230, telemetry: 230, 'quick-notes': 230, storage: 230, 'vmm-dock': 230 },
    quickNoteText:
      'Modo 128 MB ativo:\n• Sem TPM 2.0\n• Sem Secure Boot\n• Compressão ZPool ligada',
    installedStoreAppIds: ['store-netscope'],
    createdAt: '2026-11-22T09:15:00Z',
  },
];
