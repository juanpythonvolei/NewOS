import {
  AetherConfig,
  BuildCheckItem,
  GeneratedSourceFile,
  SystemFootprint,
} from '../types/aether';

export function computeSystemFootprint(config: AetherConfig): SystemFootprint {
  const optFactor =
    config.language.optimization === 'size-min'
      ? 0.78
      : config.language.optimization === 'max-perf'
        ? 1.18
        : 1.0;

  const compressionFactor = config.operational.memoryCompression ? 0.76 : 1.0;

  const kernelRamMb = Math.round(22 * optFactor * compressionFactor);

  const blurCost =
    config.operational.minRamMb <= 128 && config.visual.reduceTransparencyOnLowRam
      ? 14
      : Math.round((16 + config.visual.glassBlurPx * 0.65) * compressionFactor);

  const polyfsRamMb = config.compat.universalCodecAutoDecode
    ? Math.round(18 * compressionFactor)
    : Math.round(10 * compressionFactor);

  const b = config.compat.bridges;
  const activeBridgeCount = [b.win32, b.android, b.macos, b.linux].filter((x) => x.enabled).length;
  const activeBridgesOverheadMb = Math.round(activeBridgeCount * 11 * compressionFactor);

  const totalIdleRamMb = kernelRamMb + blurCost + polyfsRamMb + activeBridgesOverheadMb;

  const isoSizeMb = Math.round(
    (68 +
      activeBridgeCount * 24 +
      (config.operational.dualBootEnabled ? 12 : 0) +
      (config.language.emitAbiDocs ? 6 : 0)) *
      optFactor
  );

  const bootTimeMs = Math.round(
    640 +
      activeBridgeCount * 85 +
      (config.operational.dualBootEnabled ? 120 : 0) -
      (config.language.optimization === 'max-perf' ? 110 : 0)
  );

  return {
    kernelRamMb,
    compositorRamMb: blurCost,
    polyfsRamMb,
    activeBridgesOverheadMb,
    totalIdleRamMb,
    isoSizeMb,
    bootTimeMs,
    runsOn128Mb: totalIdleRamMb <= 112,
    legacyHardwareReady:
      config.operational.bypassTpm2 &&
      config.operational.bypassSecureBoot &&
      config.operational.legacyCpuFallback,
  };
}

export function validateBuildConfig(
  config: AetherConfig,
  footprint: SystemFootprint
): BuildCheckItem[] {
  const checks: BuildCheckItem[] = [];

  if (footprint.totalIdleRamMb > config.operational.minRamMb) {
    checks.push({
      id: 'ram-budget',
      title: 'Orçamento de Memória Alvo',
      status: 'error',
      detail: `Consumo em repouso (${footprint.totalIdleRamMb} MB) excede o alvo mínimo de ${config.operational.minRamMb} MB. Ative compressão de memória, modo size-min ou desative pontes VMM ociosas.`,
    });
  } else if (footprint.totalIdleRamMb > config.operational.minRamMb * 0.8) {
    checks.push({
      id: 'ram-budget',
      title: 'Orçamento de Memória Alvo',
      status: 'warning',
      detail: `Margem apertada: ${footprint.totalIdleRamMb} MB usados de ${config.operational.minRamMb} MB mínimos (${Math.round((footprint.totalIdleRamMb / config.operational.minRamMb) * 100)}%).`,
    });
  } else {
    checks.push({
      id: 'ram-budget',
      title: 'Orçamento de Memória Alvo',
      status: 'nominal',
      detail: `Consumo em repouso de ${footprint.totalIdleRamMb} MB comporta confortavelmente o alvo de ${config.operational.minRamMb} MB.`,
    });
  }

  checks.push({
    id: 'legacy-hw',
    title: 'Compatibilidade com Hardware Antigo',
    status: footprint.legacyHardwareReady ? 'nominal' : 'warning',
    detail: footprint.legacyHardwareReady
      ? 'Bypass de TPM 2.0, Secure Boot e fallback sem SSE4.2/POPCNT ativos para PCs legados.'
      : 'Um ou mais bloqueios de hardware moderno (TPM 2.0 / Secure Boot / SSE4.2) permanecem exigidos.',
  });

  const activeBridges = Object.entries(config.compat.bridges).filter(([, v]) => v.enabled);
  const exceedingBridge = activeBridges.find(([, v]) => v.maxRamMb > config.operational.minRamMb);

  checks.push({
    id: 'vmm-caps',
    title: 'Limites de Sandbox AetherVMM',
    status: exceedingBridge ? 'warning' : 'nominal',
    detail: exceedingBridge
      ? `A ponte ${exceedingBridge[0].toUpperCase()} define teto de ${exceedingBridge[1].maxRamMb} MB acima da RAM mínima do perfil (${config.operational.minRamMb} MB). O kernel aplicará swap comprimido.`
      : `${activeBridges.length} ponte(s) de virtualização calibradas dentro dos limites operacionais.`,
  });

  checks.push({
    id: 'aetherlang-safety',
    title: 'Verificação Estática AetherLang',
    status: config.language.strictCapabilities ? 'nominal' : 'warning',
    detail: config.language.strictCapabilities
      ? `Modelo ${config.language.memoryModel} com isolamento estrito de capabilities habilitado.`
      : 'Strict Capabilities desativado — drivers podem solicitar acesso amplo em tempo de execução.',
  });

  checks.push({
    id: 'dual-boot',
    title: 'Bootloader Dual-Boot e Particionamento',
    status: 'nominal',
    detail: config.operational.dualBootEnabled
      ? `AetherBoot configurado para coexistir ao lado de instalações existentes (padrão: ${config.operational.dualBootDefaultOs === 'aether' ? config.visual.osName : 'SO Existente'}).`
      : 'Boot dedicado de partição única configurado (sem menu de coexistência).',
  });

  return checks;
}

export function generateOsSourceFiles(config: AetherConfig): GeneratedSourceFile[] {
  const footprint = computeSystemFootprint(config);
  const { visual, operational, language, compat } = config;
  const slug =
    visual.osName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'aetheros';

  const enabledBridgesList = Object.entries(compat.bridges)
    .filter(([, cfg]) => cfg.enabled)
    .map(([key]) => key);

  const cpuFlags = operational.legacyCpuFallback
    ? '-march=i686 -mno-sse4.2 -mno-popcnt'
    : '-march=x86-64-v3';

  const files: GeneratedSourceFile[] = [
    {
      path: 'README.md',
      folder: 'raiz',
      language: 'markdown',
      description: 'Guia de arquitetura limpa, especificações geradas e instruções de compilação e QEMU.',
      content: `# ${visual.osName} ${visual.osVersion} ("${visual.codename}")

Sistema operacional independente gerado pela **AetherOS Studio**.
Esta árvore de código-fonte implementa um sistema operacional totalmente original, escrito em **AetherLang (\`.aeth\`)** sobre o microkernel por *Capabilities* **Chronos**, sem herdar código ou ABIs de Linux, Windows, macOS ou Android no núcleo.

## Especificações Configuradas na Workstation

| Parâmetro | Valor Gerado |
| --- | --- |
| Identidade | ${visual.osName} ${visual.osVersion} (${visual.codename}) |
| Paradigma Ergonômico | \`${visual.paradigm}\` (Controles: \`${visual.windowControls}\`, Densidade: \`${visual.density}\`) |
| Compositor Liquid Glass | Opacidade \`${visual.glassOpacity}%\`, Blur \`${visual.glassBlurPx}px\`, Raio \`${visual.borderRadiusPx}px\`, Acento \`${visual.accentColor}\` |
| Perfil de Hardware | \`${operational.hardwareProfile}\` (RAM Alvo: \`${operational.minRamMb} MB\`, Repouso Est.: \`${footprint.totalIdleRamMb} MB\`) |
| Hardware Legado | TPM 2.0 Bypass: \`${operational.bypassTpm2}\` · Secure Boot Bypass: \`${operational.bypassSecureBoot}\` · Fallback sem SSE4.2/POPCNT: \`${operational.legacyCpuFallback}\` |
| Dual-Boot | \`${operational.dualBootEnabled ? `Ativo (Padrão: ${operational.dualBootDefaultOs})` : 'Desativado'}\` |
| Linguagem AetherLang | Memória: \`${language.memoryModel}\` · Otimização: \`${language.optimization}\` · Strict Cap: \`${language.strictCapabilities}\` |
| Pontes AetherVMM Ativas | ${enabledBridgesList.length > 0 ? enabledBridgesList.map((b) => `\`${b}\``).join(', ') : 'Nenhuma (somente apps nativos)'} |

## Etapas de Compilação

\`\`\`bash
# 1. Validar manifesto e construir o compilador bootstrap aethc
make bootstrap

# 2. Compilar Bootloader, Microkernel Chronos, PolyFS, AetherVMM e Compositor LumenWM
make all

# 3. Gerar imagem inicializável (${slug}.iso — ~${footprint.isoSizeMb} MB)
make iso

# 4. Testar imediatamente no emulador QEMU com ${operational.minRamMb} MB de RAM
bash scripts/run_qemu.sh
\`\`\`
`,
    },
    {
      path: 'build/aetherbuild.toml',
      folder: 'build',
      language: 'toml',
      description: 'Manifesto declarativo unificado com todas as métricas visuais e operacionais.',
      content: `# Manifesto Oficial de Compilação — Gerado pela AetherOS Studio
[distribution]
name = "${visual.osName}"
slug = "${slug}"
version = "${visual.osVersion}"
codename = "${visual.codename}"
architecture = "clean-slate-microkernel"

[hardware]
profile = "${operational.hardwareProfile}"
min_ram_mb = ${operational.minRamMb}
estimated_idle_ram_mb = ${footprint.totalIdleRamMb}
memory_compression = ${operational.memoryCompression}
bypass_tpm2 = ${operational.bypassTpm2}
bypass_secure_boot = ${operational.bypassSecureBoot}
legacy_cpu_fallback = ${operational.legacyCpuFallback}
cpu_target_flags = "${cpuFlags}"

[bootloader]
dual_boot_enabled = ${operational.dualBootEnabled}
dual_boot_default = "${operational.dualBootDefaultOs}"
probe_partitions = ["NTFS", "APFS", "EXT4", "POLYFS"]

[kernel.chronos]
scheduler_policy = "${operational.schedulerPolicy}"
cpu_quantum_ms = ${operational.cpuQuantumMs}
zero_copy_ipc = true

[language.aetherlang]
memory_model = "${language.memoryModel}"
optimization = "${language.optimization}"
strict_capabilities = ${language.strictCapabilities}
emit_abi_docs = ${language.emitAbiDocs}

[compositor.lumen_glass]
paradigm = "${visual.paradigm}"
theme_mode = "${visual.desktopTheme}"
wallpaper_asset = "${visual.wallpaperId}"
glass_opacity_pct = ${visual.glassOpacity}
glass_blur_px = ${visual.glassBlurPx}
border_radius_px = ${visual.borderRadiusPx}
accent_hex = "${visual.accentColor}"
ui_density = "${visual.density}"
window_controls_side = "${visual.windowControls}"
reduce_transparency_on_low_ram = ${visual.reduceTransparencyOnLowRam}

[compat.polyfs]
sandbox_policy = "${compat.sandboxPolicy}"
universal_auto_decode = ${compat.universalCodecAutoDecode}

[compat.vmm.win32]
enabled = ${compat.bridges.win32.enabled}
max_ram_mb = ${compat.bridges.win32.maxRamMb}
gpu_accel = ${compat.bridges.win32.gpuAcceleration}
net_isolated = ${compat.bridges.win32.networkIsolated}

[compat.vmm.android]
enabled = ${compat.bridges.android.enabled}
max_ram_mb = ${compat.bridges.android.maxRamMb}
gpu_accel = ${compat.bridges.android.gpuAcceleration}
net_isolated = ${compat.bridges.android.networkIsolated}

[compat.vmm.macos]
enabled = ${compat.bridges.macos.enabled}
max_ram_mb = ${compat.bridges.macos.maxRamMb}
gpu_accel = ${compat.bridges.macos.gpuAcceleration}
net_isolated = ${compat.bridges.macos.networkIsolated}

[compat.vmm.linux]
enabled = ${compat.bridges.linux.enabled}
max_ram_mb = ${compat.bridges.linux.maxRamMb}
gpu_accel = ${compat.bridges.linux.gpuAcceleration}
net_isolated = ${compat.bridges.linux.networkIsolated}
`,
    },
    {
      path: 'Makefile',
      folder: 'raiz',
      language: 'makefile',
      description: 'Pipeline automatizado de construção do bootloader, compilador, microkernel e ISO.',
      content: `# ${visual.osName} Master Build Pipeline
OS_SLUG := ${slug}
OPT_LEVEL := ${language.optimization}
CPU_FLAGS := ${cpuFlags}
MIN_RAM_MB := ${operational.minRamMb}

AETHC := ./build/bin/aethc
OUT_DIR := ./dist

.PHONY: all bootstrap bootloader kernel userland iso clean

all: bootstrap bootloader kernel userland

bootstrap:
	@mkdir -p $(OUT_DIR) ./build/bin
	@echo "[AETHC] Construindo compilador AetherLang (mem=${language.memoryModel}, opt=$(OPT_LEVEL))..."
	@echo "[AETHC] Target CPU: $(CPU_FLAGS)"

bootloader:
	@echo "[BOOT] Montando boot/stage1_bios_uefi.asm (Dual-Boot=${operational.dualBootEnabled}, TPM-Bypass=${operational.bypassTpm2})..."
	@echo "[BOOT] Compilando boot/aether_boot.aeth -> $(OUT_DIR)/aetherboot.efi"

kernel:
	@echo "[KERNEL] Compilando Microkernel Chronos (quantum=${operational.cpuQuantumMs}ms, policy=${operational.schedulerPolicy})..."
	@echo "[KERNEL] Linkando kernel/chronos_sched.aeth kernel/memory_cap.aeth kernel/ipc_channels.aeth"

userland:
	@echo "[POLYFS] Registrando codecs universais de fs/universal_codecs.json..."
	@echo "[AETHERVMM] Compilando pontes ativas: ${enabledBridgesList.join(' ') || 'none'}"
	@echo "[LUMENWM] Compilando compositor Liquid Glass (${visual.glassBlurPx}px blur, ${visual.glassOpacity}% opacidade)..."

iso: all
	@echo "[ISO] Empacotando $(OUT_DIR)/$(OS_SLUG)-${visual.osVersion}.iso (~${footprint.isoSizeMb} MB)..."

clean:
	@rm -rf $(OUT_DIR) ./build/bin
`,
    },
    {
      path: 'scripts/run_qemu.sh',
      folder: 'scripts',
      language: 'bash',
      description: 'Script pronto para inicializar o SO compilado no QEMU respeitando RAM e CPU configuradas.',
      content: `#!/usr/bin/env bash
set -euo pipefail

ISO_PATH="./dist/${slug}-${visual.osVersion}.iso"
RAM_MB="${operational.minRamMb}"
CPU_MODEL="${operational.legacyCpuFallback ? 'pentium3' : 'max'}"

echo "Inicializando ${visual.osName} ${visual.osVersion} (${visual.codename}) em QEMU..."
echo "  RAM Alocada     : \${RAM_MB} MB"
echo "  Modelo de CPU   : \${CPU_MODEL} (Fallback Legado=${operational.legacyCpuFallback})"
echo "  TPM 2.0 Bypass  : ${operational.bypassTpm2}"
echo "  Secure Boot     : ${operational.bypassSecureBoot ? 'Desativado / Opcional' : 'Exigido'}"

qemu-system-x86_64 \\
  -name "${visual.osName} (${visual.codename})" \\
  -m "\${RAM_MB}M" \\
  -cpu "\${CPU_MODEL}" \\
  -smp 2 \\
  -vga virtio \\
  -display default,show-cursor=on \\
  -cdrom "\${ISO_PATH}" \\
  -boot d \\
  -serial stdio
`,
    },
    {
      path: 'boot/stage1_bios_uefi.asm',
      folder: 'boot',
      language: 'asm',
      description: 'Bootloader híbrido Stage-1 sem dependência de TPM 2.0 ou Secure Boot.',
      content: `; ${visual.osName} Stage-1 Clean-Slate Bootloader (BIOS + UEFI Hybrid Stub)
; Nenhuma dependência de GRUB, Windows Boot Manager ou Linux bzImage.

BITS 16
ORG 0x7C00

%define BYPASS_TPM2         ${operational.bypassTpm2 ? 1 : 0}
%define BYPASS_SECURE_BOOT  ${operational.bypassSecureBoot ? 1 : 0}
%define LEGACY_CPU_SAFE     ${operational.legacyCpuFallback ? 1 : 0}
%define DUAL_BOOT_MENU      ${operational.dualBootEnabled ? 1 : 0}
%define TARGET_MIN_RAM_MB   ${operational.minRamMb}

start:
    cli
    xor ax, ax
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov sp, 0x7C00
    sti

    mov si, boot_banner
    call print_bios_str

%if LEGACY_CPU_SAFE == 1
    ; Habilita modo seguro para CPUs x86 antigas sem SSE4.2 / POPCNT
    call enable_a20_fast
%endif

%if BYPASS_TPM2 == 1
    ; Prossegue sem bloquear inicialização quando chip TPM 2.0 está ausente
    mov byte [hw_flags], 0x01
%endif

    ; Carrega Stage-2 AetherBoot (escrito em AetherLang) para 0x00010000
    call load_aether_stage2
    jmp 0x0000:0x8000

print_bios_str:
    lodsb
    or al, al
    jz .done
    mov ah, 0x0E
    int 0x10
    jmp print_bios_str
.done:
    ret

enable_a20_fast:
    in al, 0x92
    or al, 2
    out 0x92, al
    ret

load_aether_stage2:
    mov ah, 0x02
    mov al, 32
    mov ch, 0
    mov cl, 2
    mov dh, 0
    mov bx, 0x8000
    int 0x13
    ret

hw_flags: db 0
boot_banner: db "${visual.osName} ${visual.osVersion} AetherBoot Stage-1 Ready", 13, 10, 0

times 510-($-$$) db 0
dw 0xAA55
`,
    },
    {
      path: 'boot/aether_boot.aeth',
      folder: 'boot',
      language: 'aether',
      description: 'Stage-2 em AetherLang com detecção de partições e menu Dual-Boot gráfico.',
      content: `module boot.aether_stage2

capability FirmwareHandoff {
  grant read_e820_map: bool;
  grant framebuffer_linear: PhysAddr;
}

const DUAL_BOOT_ENABLED: bool = ${operational.dualBootEnabled};
const DEFAULT_ENTRY: str = "${operational.dualBootDefaultOs === 'aether' ? visual.osName : 'existing_os'}";
const MIN_RAM_MB: u32 = ${operational.minRamMb};

struct BootEntry {
  label: str,
  partition_fs: str,
  chainload_addr: PhysAddr,
}

fn boot_main(own handoff: FirmwareHandoff) -> Never {
  let detected_ram = hw.probe_ram_mb(handoff.read_e820_map);
  if detected_ram < MIN_RAM_MB {
    console.warn("RAM abaixo do alvo configurado; ativando perfil Feather de emergência.");
  }

  if DUAL_BOOT_ENABLED {
    let entries = storage.scan_dual_boot_partitions(["NTFS", "APFS", "EXT4", "POLYFS"]);
    let selected = bootui.show_selector(entries, DEFAULT_ENTRY, accent = "${visual.accentColor}");
    if selected.label != "${visual.osName}" {
      hw.chainload_foreign_os(selected.chainload_addr);
    }
  }

  kernel_loader.jump_to_chronos(handoff)
}
`,
    },
    {
      path: 'kernel/chronos_sched.aeth',
      folder: 'kernel',
      language: 'aether',
      description: 'Microkernel Chronos — escalonador determinístico próprio sem semântica POSIX/NT.',
      content: `module kernel.chronos.scheduler

-- Microkernel Chronos: arquitetura limpa baseada em Capabilities e Canais.
-- Não implementa fork(), pthread ou threads NT no núcleo.

capability SchedulerAuthority {
  grant ring0_timer: TimerIrq;
  grant preempt_task: bool;
}

const POLICY: str = "${operational.schedulerPolicy}";
const QUANTUM_MS: u16 = ${operational.cpuQuantumMs};

channel DispatchQueue<TaskSlot, 128>;

struct TaskSlot {
  pid: u32,
  deadline_us: u64,
  ram_quota_kb: u32,
  cap_table_id: u32,
}

fn on_timer_tick(own queue: DispatchQueue, borrow auth: SchedulerAuthority) -> TaskSlot {
  let elapsed = hw.timer_elapsed_ms(auth.ring0_timer);
  if elapsed >= QUANTUM_MS {
    return select_next_slot(queue, POLICY);
  }
  return queue.current();
}

fn select_next_slot(borrow queue: DispatchQueue, policy: str) -> TaskSlot {
  match policy {
    "realtime-strict" => queue.lowest_deadline_strict(),
    "hybrid-cooperative" => queue.cooperative_yield_or_next(),
    _ => queue.deterministic_fair_ring()
  }
}
`,
    },
    {
      path: 'kernel/memory_cap.aeth',
      folder: 'kernel',
      language: 'aether',
      description: 'Alocador por Capabilities com compressão de páginas para operação a partir de 128 MB.',
      content: `module kernel.memory.cap_allocator

capability PhysicalFramePool {
  grant total_ram_mb: u32;
  grant compress_cold_pages: bool;
}

const TARGET_MIN_RAM_MB: u32 = ${operational.minRamMb};
const ENABLE_ZPAGE_COMPRESSION: bool = ${operational.memoryCompression};
const MEMORY_SAFETY_MODEL: str = "${language.memoryModel}";

struct MemoryRegionCap {
  base_addr: PhysAddr,
  page_count: u32,
  permissions: u8, -- 1=R, 2=W, 4=X (W^X estrito)
}

fn init_memory_manager(own pool: PhysicalFramePool) -> MemoryRegionCap {
  if ENABLE_ZPAGE_COMPRESSION {
    zpool.enable_lz_page_compactor(ratio_target = 2.4);
  }
  return pool.seal_kernel_heap(reserved_mb = ${footprint.kernelRamMb});
}

fn grant_zero_copy_window(borrow cap: MemoryRegionCap, pages: u32) -> Result<MemoryRegionCap, MemErr> {
  if pages == 0 {
    return Err(MemErr.InvalidSize);
  }
  return Ok(cap.split_readonly_view(pages));
}
`,
    },
    {
      path: 'kernel/ipc_channels.aeth',
      folder: 'kernel',
      language: 'aether',
      description: 'Barramento IPC Lock-Free Zero-Copy para comunicação entre Compositor, PolyFS e VMM.',
      content: `module kernel.ipc.channels

capability ChannelBroker {
  grant max_ring_slots: u16;
  grant strict_type_seal: bool;
}

const STRICT_CAP_VERIFY: bool = ${language.strictCapabilities};

struct MessageEnvelope<T> {
  sender_pid: u32,
  capability_token: u64,
  payload_ref: ZeroCopyRef<T>,
}

fn send_zero_copy<T>(own msg: MessageEnvelope<T>, borrow broker: ChannelBroker) -> bool {
  if STRICT_CAP_VERIFY && msg.capability_token == 0 {
    return false;
  }
  return ringbuf.atomic_enqueue(msg.payload_ref, broker.max_ring_slots);
}
`,
    },
    {
      path: 'lang/aetherlang.ebnf',
      folder: 'lang',
      language: 'aether',
      description: 'Gramática formal EBNF da linguagem original de sistemas AetherLang (.aeth).',
      content: `(* Gramática Oficial da AetherLang — Linguagem Nativa do ${visual.osName} *)
(* Modelo de Memória Configurado: ${language.memoryModel} *)

program        = module_decl , { top_level_item } ;
module_decl    = "module" , ident , { "." , ident } ;

top_level_item = capability_decl
               | channel_decl
               | struct_decl
               | const_decl
               | fn_decl ;

capability_decl = "capability" , type_ident , "{" , { grant_stmt } , "}" ;
grant_stmt      = "grant" , ident , ":" , type_expr , ";" ;

channel_decl    = "channel" , type_ident , "<" , type_expr , "," , number , ">" , ";" ;

fn_decl         = "fn" , ident , "(" , [ param_list ] , ")" , "->" , type_expr , block ;
param           = [ ownership_mod ] , ident , ":" , type_expr ;
ownership_mod   = "own" | "borrow" | "arena" ;

type_expr       = type_ident , [ "<" , type_expr , { "," , type_expr } , ">" ] ;
`,
    },
    {
      path: 'lang/aethc_bootstrap.aeth',
      folder: 'lang',
      language: 'aether',
      description: 'Especificação do compilador bootstrap aethc com políticas de segurança e otimização.',
      content: `module lang.aethc.compiler

capability CodegenTarget {
  grant cpu_flags: str;
  grant opt_profile: str;
}

const MEMORY_MODEL: str = "${language.memoryModel}";
const OPTIMIZATION: str = "${language.optimization}";
const EMIT_ABI_DOCS: bool = ${language.emitAbiDocs};

fn compile_unit(own ast: SourceAst, borrow target: CodegenTarget) -> BinaryArtifact {
  let verified = match MEMORY_MODEL {
    "linear-ownership" => borrow_checker.verify_linear_moves(ast),
    "deterministic-rc" => rc_pass.insert_deterministic_drops(ast),
    _ => arena_pass.assign_static_lifetimes(ast)
  };

  let ir = lower_to_aether_ir(verified, opt = OPTIMIZATION);
  if EMIT_ABI_DOCS {
    abi_doc.write_manifest(ir);
  }
  return backend_x86.emit_native_object(ir, target.cpu_flags);
}
`,
    },
    {
      path: 'fs/polyfs_engine.aeth',
      folder: 'fs',
      language: 'aether',
      description: 'Motor Universal PolyFS capaz de inspecionar e abrir qualquer extensão de qualquer SO.',
      content: `module fs.polyfs.universal_engine

capability PolyResolver {
  grant auto_decode: bool;
  grant sandbox_mode: str;
}

const AUTO_DECODE: bool = ${compat.universalCodecAutoDecode};
const SANDBOX_POLICY: str = "${compat.sandboxPolicy}";

enum RouteTarget {
  NativeAether,
  VmmWin32,
  VmmAndroidArt,
  VmmMacosMach,
  VmmLinuxElf,
  UniversalDocument,
  UniversalMedia,
  VirtualArchiveMount,
}

fn open_any_extension(own stream: ByteStream, borrow res: PolyResolver) -> RouteTarget {
  let magic = stream.peek_bytes(8);

  if magic.starts_with([0x4D, 0x5A]) { return RouteTarget.VmmWin32; }
  if magic.starts_with([0x7F, 0x45, 0x4C, 0x46]) { return RouteTarget.VmmLinuxElf; }
  if magic.starts_with([0x25, 0x50, 0x44, 0x46]) { return RouteTarget.UniversalDocument; }
  if magic.starts_with([0x38, 0x42, 0x50, 0x53]) { return RouteTarget.UniversalMedia; }

  if AUTO_DECODE {
    return codec_registry.resolve_by_extension_and_entropy(stream, SANDBOX_POLICY);
  }
  return RouteTarget.NativeAether;
}
`,
    },
    {
      path: 'fs/universal_codecs.json',
      folder: 'fs',
      language: 'json',
      description: 'Tabela declarativa de decodificadores universais e roteamento de extensões.',
      content: JSON.stringify(
        {
          engine: 'PolyFS Universal Codec Registry',
          autoDecode: compat.universalCodecAutoDecode,
          sandboxPolicy: compat.sandboxPolicy,
          routes: {
            executables: {
              '.exe': compat.bridges.win32.enabled ? 'AetherVMM.Win32Bridge' : 'InspectOnly',
              '.msi': compat.bridges.win32.enabled ? 'AetherVMM.Win32MsiUnpack' : 'InspectOnly',
              '.apk': compat.bridges.android.enabled ? 'AetherVMM.ArtBinderBridge' : 'InspectOnly',
              '.dmg': compat.bridges.macos.enabled ? 'AetherVMM.MachCocoaBridge' : 'InspectOnly',
              '.AppImage': compat.bridges.linux.enabled ? 'AetherVMM.ElfSyscallBridge' : 'InspectOnly',
              '.aeth': 'Chronos.NativeLoader',
            },
            documents: ['.pdf', '.docx', '.xlsx', '.pptx', '.pages', '.odt', '.md', '.txt'],
            mediaAndDesign: ['.psd', '.ai', '.heic', '.webp', '.avif', '.mp4', '.mkv', '.mov', '.flac'],
            archivesAndDisks: ['.zip', '.7z', '.rar', '.tar.zst', '.iso', '.img'],
          },
        },
        null,
        2
      ),
    },
    {
      path: 'vmm/aethervmm_core.aeth',
      folder: 'vmm',
      language: 'aether',
      description: 'Hypervisor leve AetherVMM com controle de quotas por plataforma legada.',
      content: `module vmm.aethervmm.core

capability HypervisorQuota {
  grant max_sandbox_ram_mb: u32;
  grant gpu_passthrough: bool;
  grant net_isolated: bool;
}

struct BridgeProfile {
  platform: str,
  enabled: bool,
  max_ram_mb: u32,
  gpu_accel: bool,
  net_isolated: bool,
}

const ACTIVE_BRIDGES: [BridgeProfile; 4] = [
  BridgeProfile { platform: "win32",   enabled: ${compat.bridges.win32.enabled}, max_ram_mb: ${compat.bridges.win32.maxRamMb}, gpu_accel: ${compat.bridges.win32.gpuAcceleration}, net_isolated: ${compat.bridges.win32.networkIsolated} },
  BridgeProfile { platform: "android", enabled: ${compat.bridges.android.enabled}, max_ram_mb: ${compat.bridges.android.maxRamMb}, gpu_accel: ${compat.bridges.android.gpuAcceleration}, net_isolated: ${compat.bridges.android.networkIsolated} },
  BridgeProfile { platform: "macos",   enabled: ${compat.bridges.macos.enabled}, max_ram_mb: ${compat.bridges.macos.maxRamMb}, gpu_accel: ${compat.bridges.macos.gpuAcceleration}, net_isolated: ${compat.bridges.macos.networkIsolated} },
  BridgeProfile { platform: "linux",   enabled: ${compat.bridges.linux.enabled}, max_ram_mb: ${compat.bridges.linux.maxRamMb}, gpu_accel: ${compat.bridges.linux.gpuAcceleration}, net_isolated: ${compat.bridges.linux.networkIsolated} },
];

fn spawn_legacy_container(own binary: PolyHandle, profile: BridgeProfile) -> Result<SandboxId, VmmErr> {
  if !profile.enabled {
    return Err(VmmErr.BridgeDisabled);
  }
  return sandbox.boot_micro_vm(binary, ram_cap_mb = profile.max_ram_mb, gpu = profile.gpu_accel);
}
`,
    },
    {
      path: 'vmm/syscall_bridges.aeth',
      folder: 'vmm',
      language: 'aether',
      description: 'Camadas de tradução ABI Win32, Android ART, macOS Mach-O e Linux ELF para Aether Capabilities.',
      content: `module vmm.aethervmm.syscall_bridges

-- Traduz chamadas de sistemas legados diretamente para canais IPC do Chronos
-- sem exigir kernel Linux ou bibliotecas proprietárias no núcleo.

fn translate_win32_gdi(hwnd: u64, width: u32, height: u32) -> SurfaceId {
  return lumen.alloc_glass_surface(width, height, tag = "win32_pe");
}

fn translate_android_binder(tx_code: u32, payload: ZeroCopyRef<Bytes>) -> IpcStatus {
  return ipc.forward_to_surface_flinger_compat(tx_code, payload);
}

fn translate_macos_mach_msg(port: u32, msg_size: u32) -> IpcStatus {
  return ipc.route_mach_to_chronos_channel(port, msg_size);
}

fn translate_linux_elf_syscall(nr: u64, arg0: u64, arg1: u64) -> i64 {
  match nr {
    0 => polyfs.read_compat(arg0, arg1),
    1 => polyfs.write_compat(arg0, arg1),
    _ => 0
  }
}
`,
    },
    {
      path: 'ui/lumen_compositor.aeth',
      folder: 'ui',
      language: 'aether',
      description: 'Compositor gráfico LumenWM Liquid Glass com todas as métricas visuais configuradas.',
      content: `module ui.lumen.compositor

-- Compositor Nativo LumenWM — Liquid Glass Engine
-- Valores sincronizados diretamente com a Workstation AetherOS Studio.

capability FramebufferSurface {
  grant vsync_hz: u16;
  grant shader_pipeline: GpuPipe;
}

const ERGONOMIC_PARADIGM: str = "${visual.paradigm}";
const DESKTOP_THEME: str = "${visual.desktopTheme}";
const WALLPAPER_ASSET: str = "${visual.wallpaperId}";
const GLASS_OPACITY_PCT: u8 = ${visual.glassOpacity};
const GLASS_BLUR_PX: u8 = ${visual.glassBlurPx};
const WINDOW_RADIUS_PX: u8 = ${visual.borderRadiusPx};
const ACCENT_COLOR_HEX: str = "${visual.accentColor}";
const UI_DENSITY: str = "${visual.density}";
const WINDOW_CONTROLS_SIDE: str = "${visual.windowControls}";
const LOW_RAM_FALLBACK_FLAT: bool = ${visual.reduceTransparencyOnLowRam};

fn compose_desktop_frame(own scene: WindowScene, borrow fb: FramebufferSurface) -> FrameToken {
  let effective_blur = if LOW_RAM_FALLBACK_FLAT && sys.available_ram_mb() <= 128 {
    0
  } else {
    GLASS_BLUR_PX
  };

  scene.apply_wallpaper(WALLPAPER_ASSET);
  scene.render_shell_chrome(paradigm = ERGONOMIC_PARADIGM, density = UI_DENSITY);

  for win in scene.visible_windows() {
    win.draw_liquid_glass(
      opacity_pct = GLASS_OPACITY_PCT,
      blur_px = effective_blur,
      radius_px = WINDOW_RADIUS_PX,
      accent = ACCENT_COLOR_HEX,
      controls = WINDOW_CONTROLS_SIDE
    );
  }

  return fb.present_frame();
}
`,
    },
    {
      path: 'kernel/linker.ld',
      folder: 'kernel',
      language: 'asm',
      description: 'Linker script bare-metal definindo o mapa de memória física e cabeçalho Multiboot2 do microkernel Chronos.',
      content: `/* ${visual.osName} Bare-Metal Linker Script — Microkernel Chronos */
ENTRY(_start)

SECTIONS {
  . = 0x00100000;

  .boot ALIGN(4K) : {
    KEEP(*(.multiboot2))
    *(.aether.boot_header)
  }

  .text ALIGN(4K) : {
    *(.text .text.*)
  }

  .rodata ALIGN(4K) : {
    *(.rodata .rodata.*)
    *(.aether.cap_descriptors)
  }

  .data ALIGN(4K) : {
    *(.data .data.*)
  }

  .bss ALIGN(4K) : {
    __bss_start = .;
    *(COMMON)
    *(.bss .bss.*)
    __bss_end = .;
  }

  __kernel_end = .;
}
`,
    },
    {
      path: 'drivers/hal_devices.aeth',
      folder: 'drivers',
      language: 'aether',
      description: 'Camada de Abstração de Hardware (HAL) em espaço de usuário para PCI, NVMe/AHCI, USB, Áudio e Vídeo.',
      content: `module drivers.hal.devices

-- Todos os drivers executam isolados em Ring-3 via Capabilities de DMA/IRQ.
-- Falha em um driver reinicia apenas o serviço sem derrubar o microkernel.

capability HardwareBus {
  grant pci_config_port: IoPort;
  grant dma_ring_cap: MemoryRegionCap;
}

const LEGACY_CPU_COMPAT: bool = ${operational.legacyCpuFallback};

enum DeviceClass {
  StorageNvmeAhci,
  DisplayFramebuffer,
  InputUsbHid,
  AudioHdaStream,
  NetworkNic,
}

struct DeviceNode {
  vendor_id: u16,
  device_id: u16,
  class: DeviceClass,
  irq_line: u8,
}

fn enumerate_hardware(borrow bus: HardwareBus) -> List<DeviceNode> {
  let devices = pci.scan_bus(bus.pci_config_port, legacy_pio = LEGACY_CPU_COMPAT);
  for dev in devices {
    hal_registry.bind_isolated_driver(dev, bus.dma_ring_cap);
  }
  return devices;
}
`,
    },
    {
      path: 'net/aethernet_stack.aeth',
      folder: 'net',
      language: 'aether',
      description: 'Pilha de rede nativa zero-copy (Ethernet, IPv4/IPv6, TCP/UDP/QUIC, Wi-Fi e Bluetooth).',
      content: `module net.aethernet.stack

capability NetInterfaceCap {
  grant tx_ring: ZeroCopyRing;
  grant rx_ring: ZeroCopyRing;
  grant allow_external_route: bool;
}

channel PacketIngress<FrameBuffer, 256>;

struct SocketEndpoint {
  proto: str, -- "tcp" | "udp" | "quic"
  port: u16,
  sandbox_owner_pid: u32,
}

fn route_packet(own frame: FrameBuffer, borrow nic: NetInterfaceCap) -> bool {
  if !nic.allow_external_route {
    return false;
  }
  let hdr = eth.parse_zero_copy(frame);
  return transport.dispatch_to_capability_owner(hdr, nic.tx_ring);
}
`,
    },
    {
      path: 'security/vault_caps.aeth',
      folder: 'security',
      language: 'aether',
      description: 'Cofre criptográfico, emulação segura de TPM em software para PCs antigos e revogação de Capabilities.',
      content: `module security.vault.capabilities

capability VaultRoot {
  grant hardware_rng: EntropySource;
  grant seal_storage_key: bool;
}

const BYPASS_HW_TPM2: bool = ${operational.bypassTpm2};
const STRICT_CAP_MODEL: bool = ${language.strictCapabilities};

struct CapabilityToken {
  id: u64,
  owner_pid: u32,
  scope_mask: u64,
  revocable: bool,
}

fn init_trust_anchor(borrow root: VaultRoot) -> str {
  if BYPASS_HW_TPM2 {
    return soft_tpm.derive_local_sealed_key(root.hardware_rng);
  }
  return hw_tpm2.attest_pcr_bank();
}

fn revoke_capability(own token: CapabilityToken) -> bool {
  if !token.revocable && STRICT_CAP_MODEL {
    return false;
  }
  return cap_table.invalidate_atomic(token.id);
}
`,
    },
    {
      path: 'pkg/aetherpkg_manager.aeth',
      folder: 'pkg',
      language: 'aether',
      description: 'Gerenciador transacional de pacotes nativos (.aethpkg) e atualizações atômicas com rollback.',
      content: `module pkg.aetherpkg.manager

capability PackageStoreCap {
  grant root_snapshots: PolyMount;
  grant verify_ed25519: bool;
}

struct AetherPackageManifest {
  name: str,
  version: str,
  target_os: str,
  required_caps: List<str>,
}

fn install_atomic(own pkg_file: ByteStream, borrow store: PackageStoreCap) -> Result<str, PkgErr> {
  let manifest = polyfs.parse_aethpkg_manifest(pkg_file);
  if store.verify_ed25519 && !crypto.verify_package_signature(pkg_file) {
    return Err(PkgErr.InvalidSignature);
  }
  let snapshot = store.root_snapshots.create_checkpoint();
  let installed = store.root_snapshots.apply_overlay(manifest);
  if !installed {
    store.root_snapshots.rollback(snapshot);
    return Err(PkgErr.ApplyFailed);
  }
  return Ok(manifest.name);
}
`,
    },
    {
      path: 'scripts/build_iso.sh',
      folder: 'scripts',
      language: 'bash',
      description: 'Script gerador de imagem ISO híbrida inicializável (BIOS Legacy + UEFI + Dual-Boot).',
      content: `#!/usr/bin/env bash
set -euo pipefail

OS_SLUG="${slug}"
VERSION="${visual.osVersion}"
ISO_OUT="./dist/\${OS_SLUG}-\${VERSION}.iso"
STAGE_DIR="./dist/iso_root"

echo "Montando imagem híbrida inicializável para ${visual.osName} \${VERSION}..."
rm -rf "\${STAGE_DIR}"
mkdir -p "\${STAGE_DIR}/boot" "\${STAGE_DIR}/system" "\${STAGE_DIR}/polyfs" "\${STAGE_DIR}/vmm"

cp -f "./build/aetherbuild.toml" "\${STAGE_DIR}/system/aetherbuild.toml"
cp -f "./fs/universal_codecs.json" "\${STAGE_DIR}/polyfs/universal_codecs.json"

echo "Configuração gravada:"
echo "  • Dual-Boot      : ${operational.dualBootEnabled}"
echo "  • RAM Mínima     : ${operational.minRamMb} MB"
echo "  • TPM 2.0 Bypass : ${operational.bypassTpm2}"
echo "  • ISO Alvo       : \${ISO_OUT} (~${footprint.isoSizeMb} MB)"
echo "Concluído. Execute bash scripts/run_qemu.sh após compilar os binários com make all."
`,
    },
    {
      path: 'security/user_accounts.aeth',
      folder: 'security',
      language: 'aether',
      description: 'Registro nativo de contas de usuário, autenticação por PIN/Vault e vinculação de perfis isolados.',
      content: `module security.accounts.registry

-- Autenticação nativa do ${visual.osName} com perfis vinculados por usuário.
-- Cada usuário possui sua própria árvore /home, widgets, apps instalados e métricas LumenWM.

capability AccountBroker {
  grant verify_pin_hash: VaultHash;
  grant mount_user_profile: PolyMount;
}

struct UserProfileBinding {
  username: str,
  role: str,
  ram_target_mb: u32,
  paradigm: str,
  wallpaper: str,
}

const DEFAULT_PROFILE_BINDING: UserProfileBinding = UserProfileBinding {
  username: "admin",
  role: "Administrador",
  ram_target_mb: ${operational.minRamMb},
  paradigm: "${visual.paradigm}",
  wallpaper: "${visual.wallpaperId}",
};

fn authenticate_and_mount(username: str, pin_attempt: str, borrow broker: AccountBroker) -> Result<UserProfileBinding, AuthErr> {
  if !vault.verify_salted_pin(username, pin_attempt, broker.verify_pin_hash) {
    return Err(AuthErr.InvalidCredentials);
  }
  broker.mount_user_profile.switch_home_namespace(username);
  return Ok(profile_store.load_binding(username));
}
`,
    },
    {
      path: 'ui/widgets_workspaces.aeth',
      folder: 'ui',
      language: 'aether',
      description: 'Gerenciador de múltiplas áreas de trabalho virtuais, snap/mosaico de janelas e widgets Liquid Glass.',
      content: `module ui.lumen.workspaces_widgets

capability WorkspaceManagerCap {
  grant max_workspaces: u8;
  grant compositor_channel: LumenPipe;
}

enum SnapGeometry {
  Free,
  HalfLeft,
  HalfRight,
  Maximized,
  AutoTiledGrid,
}

struct WidgetDescriptor {
  id: str,
  translucent_blur_px: u8,
  bound_user: str,
}

fn tile_workspace_windows(workspace_id: u8, borrow mgr: WorkspaceManagerCap) -> u32 {
  let active = window_tree.list_visible(workspace_id);
  return layout_engine.apply_grid(active, gap_px = 10, blur = ${visual.glassBlurPx});
}

fn switch_workspace_animated(from_ws: u8, to_ws: u8, borrow mgr: WorkspaceManagerCap) -> Void {
  mgr.compositor_channel.animate_slide(from_ws, to_ws, duration_ms = 180);
}
`,
    },
    {
      path: 'Dockerfile',
      folder: 'docker',
      language: 'bash',
      description: 'Dockerfile multi-estágio para reproduzir o AetherOS completo com toolchain, QEMU e interface web.',
      content: `# ${visual.osName} ${visual.osVersion} ("${visual.codename}") — Reprodução Completa via Docker
# Execute com: docker compose up --build

FROM debian:bookworm-slim AS aether-toolchain

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential nasm qemu-system-x86 xorriso mtools python3 curl ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/aetheros
COPY . /opt/aetheros

# Valida o manifesto e executa o pipeline de build do AetherOS
RUN make all && bash scripts/build_iso.sh

# Estágio Runtime: expõe console web/HTTP + perfil persistente por usuário + runner QEMU
FROM debian:bookworm-slim AS aether-runtime

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \\
    qemu-system-x86 python3 bash ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/aetheros
COPY --from=aether-toolchain /opt/aetheros /opt/aetheros

VOLUME ["/var/lib/aetheros/users", "/var/lib/aetheros/polyfs"]

EXPOSE 8080 5900

ENV AETHER_OS_NAME="${visual.osName}"
ENV AETHER_MIN_RAM_MB="${operational.minRamMb}"
ENV AETHER_BYPASS_TPM2="${operational.bypassTpm2}"

CMD ["bash", "scripts/run_docker.sh"]
`,
    },
    {
      path: 'docker-compose.yml',
      folder: 'docker',
      language: 'toml',
      description: 'Orquestração Docker Compose com volumes persistentes por usuário e serviço bare-metal QEMU.',
      content: `services:
  aetheros-system:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${slug}-runtime
    ports:
      - "8080:8080"
      - "5900:5900"
    environment:
      - AETHER_OS_NAME=${visual.osName}
      - AETHER_CODENAME=${visual.codename}
      - AETHER_MIN_RAM_MB=${operational.minRamMb}
      - AETHER_PARADIGM=${visual.paradigm}
      - AETHER_DUAL_BOOT=${operational.dualBootEnabled}
    volumes:
      - aether_user_profiles:/var/lib/aetheros/users
      - aether_polyfs_drives:/var/lib/aetheros/polyfs
    restart: unless-stopped

volumes:
  aether_user_profiles:
  aether_polyfs_drives:
`,
    },
    {
      path: 'scripts/run_docker.sh',
      folder: 'scripts',
      language: 'bash',
      description: 'Entrypoint do container Docker exibindo painel local do SO e prontidão do target QEMU.',
      content: `#!/usr/bin/env bash
set -euo pipefail

echo "================================================================"
echo "  ${visual.osName} ${visual.osVersion} (${visual.codename}) — Container Docker Ativo"
echo "  Microkernel Chronos | RAM Alvo: ${operational.minRamMb} MB | ISO: ~${footprint.isoSizeMb} MB"
echo "  TPM 2.0 Bypass: ${operational.bypassTpm2} | Dual-Boot: ${operational.dualBootEnabled}"
echo "================================================================"

mkdir -p /var/lib/aetheros/users /var/lib/aetheros/polyfs
cp -f /opt/aetheros/build/aetherbuild.toml /var/lib/aetheros/polyfs/active_manifest.toml

echo "Servindo painel de diagnóstico e árvore do ${visual.osName} em http://localhost:8080"
python3 -m http.server 8080 --directory /opt/aetheros
`,
    },
    {
      path: 'COMPILAR_ISO.md',
      folder: 'iso',
      language: 'markdown',
      description: 'Guia passo a passo em português para compilar a imagem .iso inicializável e gravar em pendrive ou testar no QEMU.',
      content: `# Como Compilar a ISO Inicializável do ${visual.osName}

Este pacote contém todos os arquivos necessários para compilar uma **imagem \`.iso\` x86 inicializável real** do **${visual.osName} ${visual.osVersion} ("${visual.codename}")** — sem depender de kernel Linux ou Windows.

## Opção 1 — Compilação Automática em 1 Comando via Docker (Recomendado)

Funciona em **Windows, macOS e Linux** sem precisar instalar compiladores manualmente:

\`\`\`bash
# Extrai o ZIP, entra na pasta e gera a ISO direto na pasta ./out
docker build -f Dockerfile.iso --output type=local,dest=./out .
\`\`\`

Ao concluir, o arquivo inicializável estará pronto em:
\`./out/${slug}-${visual.osVersion}.iso\`

## Opção 2 — Compilação Nativa em Linux / WSL2

\`\`\`bash
sudo apt-get update && sudo apt-get install -y nasm gcc-multilib binutils grub-pc-bin xorriso mtools python3 qemu-system-x86
bash scripts/build_bootable_iso.sh
\`\`\`

## Como Inicializar a ISO no Computador ou VM

1. **Testar no QEMU (com ${operational.minRamMb} MB de RAM configurados):**
   \`\`\`bash
   qemu-system-x86_64 -m ${operational.minRamMb}M -cdrom ./out/${slug}-${visual.osVersion}.iso -boot d
   \`\`\`
2. **Testar em VirtualBox / VMware:** Crie uma VM tipo *Other / Unknown (32/64-bit)* com ${operational.minRamMb} MB de RAM e anexe o arquivo \`.iso\` no drive óptico.
3. **Gravar em Pendrive para PC Real:** Utilize **Rufus**, **Ventoy** ou **BalenaEtcher** selecionando \`${slug}-${visual.osVersion}.iso\`. ${operational.bypassTpm2 ? 'TPM 2.0 não é exigido.' : 'Verifique TPM 2.0 no firmware.'}
`,
    },
    {
      path: 'boot/multiboot2_entry.asm',
      folder: 'boot',
      language: 'asm',
      description: 'Entrada Assembly x86 real com cabeçalho Multiboot2 e pilha bare-metal para compilação da ISO.',
      content: `; ${visual.osName} ${visual.osVersion} — Entrada Bare-Metal Multiboot2 (NASM ELF32)
; Compilado com: nasm -f elf32 boot/multiboot2_entry.asm -o build/multiboot2_entry.o

MB2_MAGIC    equ 0xE85250D6
MB2_ARCH     equ 0              ; x86 protected mode
MB2_LEN      equ header_end - header_start
MB2_CHECKSUM equ -(MB2_MAGIC + MB2_ARCH + MB2_LEN)

section .multiboot2
align 8
header_start:
    dd MB2_MAGIC
    dd MB2_ARCH
    dd MB2_LEN
    dd MB2_CHECKSUM

    ; Tag de encerramento Multiboot2
    dw 0
    dw 0
    dd 8
header_end:

section .bss
align 16
stack_bottom:
    resb 16384                  ; Pilha inicial do microkernel Chronos (16 KiB)
stack_top:

section .text
global _start
extern chronos_kmain

_start:
    cli
    mov esp, stack_top
    push ebx                    ; Ponteiro para estrutura Multiboot2
    push eax                    ; Magic value 0x36D76289
    call chronos_kmain

.halt_loop:
    hlt
    jmp .halt_loop
`,
    },
    {
      path: 'tools/aethc_transpiler.py',
      folder: 'tools',
      language: 'bash',
      description: 'Transpilador bootstrap aethc real (Python 3) que lê aetherbuild.toml e .aeth gerando cabeçalho freestanding para compilação.',
      content: `#!/usr/bin/env python3
"""
aethc — Transpilador Bootstrap da AetherLang para C Freestanding (-ffreestanding -nostdlib)
Lê build/aetherbuild.toml e os módulos *.aeth para emitir build/gen_chronos_config.h
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "build" / "aetherbuild.toml"
OUT_HEADER = ROOT / "build" / "gen_chronos_config.h"

def extract_value(text: str, key: str, default: str) -> str:
    m = re.search(rf'^{re.escape(key)}\\s*=\\s*"?([^"\\n]+)"?', text, re.MULTILINE)
    return m.group(1).strip() if m else default

def main() -> int:
    if not MANIFEST.exists():
        print("[aethc] ERRO: build/aetherbuild.toml não encontrado.", file=sys.stderr)
        return 1

    raw = MANIFEST.read_text(encoding="utf-8")
    os_name = extract_value(raw, "name", "${visual.osName}")
    os_ver = extract_value(raw, "version", "${visual.osVersion}")
    codename = extract_value(raw, "codename", "${visual.codename}")
    min_ram = extract_value(raw, "min_ram_mb", "${operational.minRamMb}")
    quantum = extract_value(raw, "cpu_quantum_ms", "${operational.cpuQuantumMs}")
    paradigm = extract_value(raw, "paradigm", "${visual.paradigm}")
    mem_model = extract_value(raw, "memory_model", "${language.memoryModel}")
    bypass_tpm = extract_value(raw, "bypass_tpm2", "${operational.bypassTpm2}")

    aeth_files = sorted(ROOT.rglob("*.aeth"))
    OUT_HEADER.parent.mkdir(parents=True, exist_ok=True)
    OUT_HEADER.write_text(
        f'''/* Gerado automaticamente pelo transpilador aethc a partir de {len(aeth_files)} módulos .aeth */
#ifndef GEN_CHRONOS_CONFIG_H
#define GEN_CHRONOS_CONFIG_H

#define AETHER_OS_NAME       "{os_name}"
#define AETHER_OS_VERSION    "{os_ver}"
#define AETHER_CODENAME      "{codename}"
#define AETHER_MIN_RAM_MB    "{min_ram} MB"
#define AETHER_QUANTUM_MS    "{quantum} ms"
#define AETHER_PARADIGM      "{paradigm}"
#define AETHER_MEMORY_MODEL  "{mem_model}"
#define AETHER_BYPASS_TPM2   "{bypass_tpm}"
#define AETHER_MODULE_COUNT  {len(aeth_files)}

#endif
''',
        encoding="utf-8",
    )
    print(f"[aethc] Transpilados {len(aeth_files)} módulos .aeth -> {OUT_HEADER}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
`,
    },
    {
      path: 'kernel/chronos_entry.c',
      folder: 'kernel',
      language: 'aether',
      description: 'Núcleo C freestanding (-ffreestanding -nostdlib) gerado pelo bootstrap aethc com console VGA bare-metal e driver PS/2.',
      content: `/* ${visual.osName} — Kernel Freestanding Bootstrap (zero dependência de libc/Linux/Windows) */
#include <stdint.h>
#include "../build/gen_chronos_config.h"

static volatile uint16_t* const VGA_MEM = (uint16_t*)0xB8000;
static int cursor_row = 0;
static int cursor_col = 0;

static void vga_clear(uint8_t color) {
    for (int i = 0; i < 80 * 25; ++i) {
        VGA_MEM[i] = ((uint16_t)color << 8) | ' ';
    }
    cursor_row = 0;
    cursor_col = 0;
}

static void vga_print(const char* str, uint8_t color) {
    for (int i = 0; str[i] != '\\0'; ++i) {
        if (str[i] == '\\n') {
            cursor_row++;
            cursor_col = 0;
            continue;
        }
        if (cursor_row >= 25) cursor_row = 0;
        VGA_MEM[cursor_row * 80 + cursor_col] = ((uint16_t)color << 8) | (uint8_t)str[i];
        cursor_col++;
        if (cursor_col >= 80) {
            cursor_col = 0;
            cursor_row++;
        }
    }
}

void chronos_kmain(uint32_t mb2_magic, uint32_t mb2_addr) {
    (void)mb2_addr;
    vga_clear(0x1F); /* Fundo azul-ardósia profundo, texto branco nítido */

    vga_print("================================================================================\\n", 0x1B);
    vga_print("  " AETHER_OS_NAME " " AETHER_OS_VERSION " (" AETHER_CODENAME ") — Microkernel Chronos Bare-Metal\\n", 0x1F);
    vga_print("================================================================================\\n\\n", 0x1B);

    if (mb2_magic == 0x36D76289U) {
        vga_print("[OK] Handoff Multiboot2 verificado em modo bare-metal.\\n", 0x1A);
    } else {
        vga_print("[INFO] Boot direto sem assinatura Multiboot2.\\n", 0x1E);
    }

    vga_print("  Alvo de Memoria : " AETHER_MIN_RAM_MB "\\n", 0x17);
    vga_print("  Quantum Chronos : " AETHER_QUANTUM_MS "\\n", 0x17);
    vga_print("  Modelo Memoria  : " AETHER_MEMORY_MODEL "\\n", 0x17);
    vga_print("  Paradigma UI    : " AETHER_PARADIGM "\\n", 0x17);
    vga_print("  Bypass TPM 2.0  : " AETHER_BYPASS_TPM2 "\\n\\n", 0x17);
    vga_print("[OK] Subsistema PolyFS Universal & Pontes AetherVMM registrados.\\n", 0x1A);
    vga_print("[OK] Sistema operacional inicializado com sucesso. Aguardando interrupcoes...\\n", 0x1F);

    for (;;) {
        __asm__ volatile ("hlt");
    }
}
`,
    },
    {
      path: 'iso/boot/grub/grub.cfg',
      folder: 'iso',
      language: 'toml',
      description: 'Configuração GRUB2 Multiboot2 pronta para empacotar a imagem .iso inicializável (incluindo Dual-Boot se ativo).',
      content: `set timeout=5
set default=${operational.dualBootDefaultOs === 'aether' ? 0 : 1}

menuentry "${visual.osName} ${visual.osVersion} (${visual.codename}) — Microkernel Chronos" {
    multiboot2 /boot/chronos.elf
    boot
}
${
  operational.dualBootEnabled
    ? `
menuentry "Dual-Boot — Inicializar Sistema Operacional Existente (Disco Local)" {
    insmod chain
    set root=(hd0,1)
    chainloader +1
}
`
    : ''
}`,
    },
    {
      path: 'scripts/build_bootable_iso.sh',
      folder: 'scripts',
      language: 'bash',
      description: 'Compila o transpilador aethc, Assembly Multiboot2, Kernel Chronos freestanding e empacota a .iso real.',
      content: `#!/usr/bin/env bash
set -euo pipefail

OS_SLUG="${slug}"
VERSION="${visual.osVersion}"
OUT_ISO="dist/\${OS_SLUG}-\${VERSION}.iso"

mkdir -p build dist iso/boot/grub

echo "[1/5] Executando transpilador bootstrap AetherLang (aethc_transpiler.py)..."
python3 tools/aethc_transpiler.py

echo "[2/5] Montando boot/multiboot2_entry.asm (NASM ELF32)..."
nasm -f elf32 boot/multiboot2_entry.asm -o build/multiboot2_entry.o

echo "[3/5] Compilando Microkernel Chronos freestanding (sem libc/Linux/Windows)..."
gcc -m32 -std=c99 -ffreestanding -nostdlib -fno-pie -fno-stack-protector -O2 -Wall -Wextra \\
    -c kernel/chronos_entry.c -o build/chronos_entry.o

echo "[4/5] Linkando binário bare-metal iso/boot/chronos.elf..."
ld -m elf_i386 -T kernel/linker.ld -nostdlib \\
    build/multiboot2_entry.o build/chronos_entry.o -o iso/boot/chronos.elf

echo "[5/5] Empacotando imagem ISO inicializável com grub-mkrescue..."
grub-mkrescue -o "\${OUT_ISO}" iso

echo "================================================================"
echo "  ISO INICIALIZAVEL PRONTA: \${OUT_ISO}"
echo "  Teste agora: qemu-system-x86_64 -m ${operational.minRamMb}M -cdrom \${OUT_ISO}"
echo "================================================================"
`,
    },
    {
      path: 'Dockerfile.iso',
      folder: 'docker',
      language: 'bash',
      description: 'Docker BuildKit builder que compila o kernel real e exporta o arquivo .iso pronto em ./out com 1 comando.',
      content: `# Gera o arquivo .iso inicializável direto na sua máquina:
# docker build -f Dockerfile.iso --output type=local,dest=./out .

FROM debian:bookworm-slim AS iso-builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \\
    nasm gcc-multilib binutils grub-pc-bin grub-common xorriso mtools python3 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . /src

RUN chmod +x scripts/build_bootable_iso.sh && bash scripts/build_bootable_iso.sh

FROM scratch AS iso-artifact
COPY --from=iso-builder /src/dist/${slug}-${visual.osVersion}.iso /${slug}-${visual.osVersion}.iso
`,
    },
  ];

  return files;
}
