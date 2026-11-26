import { AetherConfig, SystemFootprint } from '../types/aether';

export interface AetherLangDiagnostic {
  line: number;
  severity: 'ok' | 'warning' | 'error';
  message: string;
}

export interface AetherLangAnalysisResult {
  valid: boolean;
  moduleName: string;
  capabilities: string[];
  functions: string[];
  channels: string[];
  tokenCount: number;
  estimatedBinaryKb: number;
  diagnostics: AetherLangDiagnostic[];
}

export interface AetherLangTemplate {
  id: string;
  title: string;
  subtitle: string;
  code: string;
}

export const AETHERLANG_TEMPLATES: AetherLangTemplate[] = [
  {
    id: 'microkernel-sched',
    title: 'Escalonador Chronos',
    subtitle: 'Núcleo determinístico sem POSIX',
    code: `module kernel.chronos.scheduler

capability CpuSlice {
  grant quantum_ms: u16;
  grant ring_access: Ring0;
}

channel TaskReadyQueue<TaskHandle, 64>;

fn schedule_next(own queue: TaskReadyQueue, borrow cap: CpuSlice) -> Option<TaskHandle> {
  let limit = cap.quantum_ms;
  if limit < 1 {
    return None;
  }
  return queue.pop_earliest_deadline();
}

fn park_idle_core(borrow cap: CpuSlice) -> Void {
  hw.halt_until_irq(cap.ring_access);
}`,
  },
  {
    id: 'lumen-glass',
    title: 'Superfície Liquid Glass',
    subtitle: 'Compositor gráfico LumenWM',
    code: `module ui.lumen.glass_surface

capability GpuCompose {
  grant blur_radius_px: u8;
  grant opacity_pct: u8;
}

channel FrameSync<SurfaceRect, 16>;

fn render_window_frame(own rect: SurfaceRect, borrow gpu: GpuCompose) -> FrameToken {
  let frosted = lumen.backdrop_blur(rect, gpu.blur_radius_px);
  let blended = lumen.alpha_tint(frosted, gpu.opacity_pct);
  return lumen.commit_surface(blended);
}`,
  },
  {
    id: 'vmm-win32',
    title: 'Ponte Win32 AetherVMM',
    subtitle: 'Tradução de syscalls legadas',
    code: `module vmm.bridges.win32_pe

capability SandboxQuota {
  grant max_ram_mb: u32;
  grant fs_isolation: Strict;
}

channel Win32Trap<SyscallPacket, 128>;

fn translate_pe_call(own pkt: SyscallPacket, borrow quota: SandboxQuota) -> StatusCode {
  match pkt.opcode {
    0x0055 => lumen.create_surface_for_hwnd(pkt.arg0),
    0x0018 => polyfs.open_sandboxed(pkt.path, quota.fs_isolation),
    _ => StatusCode.TrapHandled
  }
}`,
  },
  {
    id: 'polyfs-codec',
    title: 'Decodificador Universal PolyFS',
    subtitle: 'Abertura de qualquer extensão',
    code: `module fs.polyfs.sniffer

capability StreamRead {
  grant magic_bytes: u64;
  grant allow_virtual_mount: bool;
}

channel DecodePipeline<FileNode, 32>;

fn resolve_any_file(own node: FileNode, borrow rd: StreamRead) -> CodecRoute {
  let sig = polyfs.read_header(node, rd.magic_bytes);
  if sig == 0x4D5A {
    return CodecRoute.VmmWin32;
  }
  if sig == 0x7F454C46 {
    return CodecRoute.VmmLinuxElf;
  }
  return CodecRoute.NativePolyViewer;
}`,
  },
];

export function analyzeAetherLang(
  source: string,
  config: AetherConfig
): AetherLangAnalysisResult {
  const lines = source.split('\n');
  const diagnostics: AetherLangDiagnostic[] = [];
  let moduleName = 'unnamed.module';
  const capabilities: string[] = [];
  const functions: string[] = [];
  const channels: string[] = [];

  let braceBalance = 0;
  let hasModule = false;

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('--')) return;

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceBalance += opens - closes;

    if (braceBalance < 0) {
      diagnostics.push({
        line: lineNo,
        severity: 'error',
        message: 'Chave de fechamento "}" sem bloco correspondente.',
      });
    }

    const modMatch = line.match(/^module\s+([a-zA-Z0-9_.]+)/);
    if (modMatch) {
      hasModule = true;
      moduleName = modMatch[1];
    }

    const capMatch = line.match(/^capability\s+([A-Z][a-zA-Z0-9_]*)/);
    if (capMatch) {
      capabilities.push(capMatch[1]);
    }

    const fnMatch = line.match(/^fn\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      functions.push(fnMatch[1]);
      const params = fnMatch[2];
      if (
        config.language.memoryModel === 'linear-ownership' &&
        params.trim().length > 0 &&
        !params.includes('own ') &&
        !params.includes('borrow ')
      ) {
        diagnostics.push({
          line: lineNo,
          severity: 'warning',
          message: `Função "${fnMatch[1]}" sem qualificador explícito "own" ou "borrow" no modo Ownership Linear.`,
        });
      }
    }

    const chMatch = line.match(/^channel\s+([A-Z][a-zA-Z0-9_]*)/);
    if (chMatch) {
      channels.push(chMatch[1]);
    }

    if (line.includes('malloc(') || line.includes('POSIX') || line.includes('#include')) {
      diagnostics.push({
        line: lineNo,
        severity: 'error',
        message: 'Primitiva legada C/POSIX proibida em código nativo AetherLang. Utilize MemCap ou canais tipados.',
      });
    }
  });

  if (!hasModule) {
    diagnostics.push({
      line: 1,
      severity: 'error',
      message: 'Declaração obrigatória "module <namespace>" ausente no topo do arquivo.',
    });
  }

  if (braceBalance !== 0) {
    diagnostics.push({
      line: lines.length,
      severity: 'error',
      message: `Blocos não balanceados (diferença de ${braceBalance} chave(s)).`,
    });
  }

  if (config.language.strictCapabilities && capabilities.length === 0) {
    diagnostics.push({
      line: 1,
      severity: 'warning',
      message: 'Modo Strict Capabilities ativo: recomenda-se declarar ao menos uma "capability" neste módulo.',
    });
  }

  const tokens = source
    .split(/[\s(){};,<>:=]+/)
    .filter((t) => t.trim().length > 0);

  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  if (diagnostics.length === 0) {
    diagnostics.push({
      line: 1,
      severity: 'ok',
      message: `Verificação aethc aprovada (${config.language.memoryModel}, otimização ${config.language.optimization}).`,
    });
  }

  const optMultiplier =
    config.language.optimization === 'size-min'
      ? 0.72
      : config.language.optimization === 'max-perf'
        ? 1.25
        : 1.0;

  return {
    valid: !hasErrors,
    moduleName,
    capabilities,
    functions,
    channels,
    tokenCount: tokens.length,
    estimatedBinaryKb: Math.max(4, Math.round((tokens.length * 0.24 + 6) * optMultiplier)),
    diagnostics,
  };
}

export function runAetherShellCommand(
  rawInput: string,
  config: AetherConfig,
  footprint: SystemFootprint,
  activeAppCount: number
): string[] {
  const cmd = rawInput.trim();
  const lower = cmd.toLowerCase();

  if (!cmd) return [];
  if (lower === 'help' || lower === 'ajuda') {
    return [
      'AetherShell — Comandos Nativos (sintaxe própria, sem bash/cmd):',
      '  sys.info      Exibe identidade do SO, kernel Chronos e perfil de hardware',
      '  mem.map       Mostra orçamento de memória e compressão em tempo real',
      '  vmm.list      Lista pontes de virtualização legada ativas no AetherVMM',
      '  poly.codecs   Lista decodificadores universais registrados no PolyFS',
      '  boot.dual     Inspeciona configuração do Bootloader Dual-Boot e TPM',
      '  aethc.check   Valida perfil atual do compilador AetherLang',
      '  clear         Limpa o histórico do console',
    ];
  }

  if (lower === 'sys.info') {
    return [
      `Sistema:      ${config.visual.osName} ${config.visual.osVersion} (${config.visual.codename})`,
      `Microkernel:  Chronos Capability Engine (${config.operational.schedulerPolicy})`,
      `Quantum CPU:  ${config.operational.cpuQuantumMs} ms`,
      `Linguagem:    AetherLang (${config.language.memoryModel})`,
      `Compositor:   LumenWM Liquid Glass (${config.visual.glassBlurPx}px blur, ${config.visual.glassOpacity}% opacidade)`,
      `Janelas:      ${activeAppCount} ativa(s) no espaço atual`,
    ];
  }

  if (lower === 'mem.map') {
    return [
      `Orçamento Alvo:    ${config.operational.minRamMb} MB`,
      `Kernel Chronos:    ${footprint.kernelRamMb} MB`,
      `Compositor Lumen:  ${footprint.compositorRamMb} MB`,
      `PolyFS + Codecs:   ${footprint.polyfsRamMb} MB`,
      `Pontes AetherVMM:  ${footprint.activeBridgesOverheadMb} MB`,
      `Total em Repouso:  ${footprint.totalIdleRamMb} MB (Compressão: ${config.operational.memoryCompression ? 'Ativa' : 'Inativa'})`,
    ];
  }

  if (lower === 'vmm.list') {
    const b = config.compat.bridges;
    return [
      'Pontes de Virtualização AetherVMM:',
      `  Win32/PE    : ${b.win32.enabled ? `Ativa (teto ${b.win32.maxRamMb} MB)` : 'Desativada'}`,
      `  Android/ART : ${b.android.enabled ? `Ativa (teto ${b.android.maxRamMb} MB)` : 'Desativada'}`,
      `  macOS/Mach  : ${b.macos.enabled ? `Ativa (teto ${b.macos.maxRamMb} MB)` : 'Desativada'}`,
      `  Linux/ELF   : ${b.linux.enabled ? `Ativa (teto ${b.linux.maxRamMb} MB)` : 'Desativada'}`,
      `Política Sandbox: ${config.compat.sandboxPolicy}`,
    ];
  }

  if (lower === 'poly.codecs') {
    return [
      'PolyFS Universal Format Engine — Registro Ativo:',
      '  • Executáveis: .exe, .msi, .apk, .dmg, .pkg, .AppImage, .deb, .aeth',
      '  • Documentos : .docx, .xlsx, .pptx, .pdf, .pages, .odt, .md',
      '  • Mídia/Arte : .psd, .heic, .webp, .mp4, .mkv, .mov, .flac',
      '  • Arquivos   : .zip, .7z, .rar, .tar.zst, .iso (montagem transparente)',
      `  Decodificação automática: ${config.compat.universalCodecAutoDecode ? 'Habilitada' : 'Manual'}`,
    ];
  }

  if (lower === 'boot.dual') {
    return [
      `Bootloader:    AetherBoot Stage-1/2 (UEFI + Legacy BIOS)`,
      `Dual-Boot:     ${config.operational.dualBootEnabled ? `Ativo (Padrão: ${config.operational.dualBootDefaultOs === 'aether' ? config.visual.osName : 'SO Existente'})` : 'Desativado'}`,
      `Bypass TPM2:   ${config.operational.bypassTpm2 ? 'Habilitado (roda em PCs antigos)' : 'Exige TPM 2.0'}`,
      `Secure Boot:   ${config.operational.bypassSecureBoot ? 'Opcional / Bypass local' : 'Obrigatório'}`,
      `CPUs Legadas:  ${config.operational.legacyCpuFallback ? 'Fallback x86 sem SSE4.2/POPCNT ativo' : 'Requer instruções modernas'}`,
    ];
  }

  if (lower === 'aethc.check') {
    return [
      `Compilador aethc — Verificação de Target:`,
      `  Modelo de Memória : ${config.language.memoryModel}`,
      `  Otimização        : ${config.language.optimization}`,
      `  Strict Capability : ${config.language.strictCapabilities ? 'Sim' : 'Não'}`,
      `  Tamanho ISO Est.  : ${footprint.isoSizeMb} MB | Boot Est.: ${footprint.bootTimeMs} ms`,
      `  Resultado         : Pronto para exportação e compilação nativa.`,
    ];
  }

  return [
    `Comando "${cmd}" não reconhecido pelo AetherShell.`,
    'Digite "help" para listar os comandos nativos disponíveis.',
  ];
}
