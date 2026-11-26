import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, KeyRound, Lock, UserPlus, X } from 'lucide-react';
import { OsUserAccount } from '../../types/aether';
import { ACCENT_SWATCHES, QUICK_PRESETS, WALLPAPERS } from '../../data/presets';

interface OsLoginScreenProps {
  users: OsUserAccount[];
  activeUserId: string;
  osName: string;
  onUnlockUser: (userId: string) => void;
  onCreateUser: (payload: {
    displayName: string;
    username: string;
    pin: string;
    role: OsUserAccount['role'];
    presetId: string;
    avatarColor: string;
  }) => OsUserAccount;
}

export const OsLoginScreen: React.FC<OsLoginScreenProps> = ({
  users,
  activeUserId,
  osName,
  onUnlockUser,
  onCreateUser,
}) => {
  const [selectedId, setSelectedId] = useState(activeUserId);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  // New user form
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<OsUserAccount['role']>('Padrão');
  const [newPresetId, setNewPresetId] = useState(QUICK_PRESETS[0].id);
  const [newColor, setNewColor] = useState(ACCENT_SWATCHES[0].hex);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const selectedUser = users.find((u) => u.id === selectedId) ?? users[0];
  const wallpaper =
    WALLPAPERS.find((w) => w.id === selectedUser.config.visual.wallpaperId) ?? WALLPAPERS[0];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === selectedUser.pin) {
      setErrorMsg(null);
      setPinInput('');
      onUnlockUser(selectedUser.id);
    } else {
      setErrorMsg(`PIN incorreto para ${selectedUser.displayName}.`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    const trimmedPin = newPin.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    if (trimmedPin.length < 4) {
      setErrorMsg('Defina um PIN ou senha com ao menos 4 dígitos.');
      return;
    }
    const username = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '') || `user${users.length + 1}`;

    const created = onCreateUser({
      displayName: trimmedName,
      username,
      pin: trimmedPin,
      role: newRole,
      presetId: newPresetId,
      avatarColor: newColor,
    });
    setCreatingNew(false);
    setNewName('');
    setNewPin('');
    setErrorMsg(null);
    setSelectedId(created.id);
    onUnlockUser(created.id);
  };

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto p-6 text-slate-100"
      style={{ background: wallpaper.fallbackGradient }}
    >
      <img
        src={wallpaper.imagePath}
        alt={wallpaper.name}
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#070B12]/65 backdrop-blur-xl" />

      {/* Top Clock */}
      <div className="relative z-10 mt-4 text-center">
        <div className="font-mono text-5xl font-semibold tracking-tight text-white tabular-nums sm:text-6xl">
          {timeStr}
        </div>
        <div className="mt-1 text-sm capitalize text-slate-300">{dateStr}</div>
      </div>

      {/* Center Auth Card */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 my-4 w-full max-w-md rounded-2xl border border-white/15 bg-[#0C121E]/80 p-6 shadow-2xl backdrop-blur-2xl"
      >
        {!creatingNew ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-slate-950 shadow-lg"
                style={{ backgroundColor: selectedUser.avatarColor }}
              >
                {selectedUser.initials}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {selectedUser.displayName}
              </h3>
              <div className="mt-0.5 text-xs text-slate-400">
                @{selectedUser.username} · {selectedUser.role} · Perfil{' '}
                {selectedUser.config.visual.codename} ({selectedUser.config.operational.minRamMb} MB)
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Digite o PIN de desbloqueio..."
                  className="w-full rounded-lg border border-white/15 bg-black/40 py-2.5 pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  title="Desbloquear sessão"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-950 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: selectedUser.avatarColor }}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {errorMsg && <p className="text-center text-xs text-red-400">{errorMsg}</p>}

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono tabular-nums">PIN desta conta: {selectedUser.pin}</span>
                <button
                  type="button"
                  onClick={() => onUnlockUser(selectedUser.id)}
                  className="font-medium text-sky-400 hover:text-sky-300"
                >
                  Entrar direto
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-white">
                Criar Conta de Usuário {osName}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(false);
                  setErrorMsg(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Nome Completo</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Ana Engenharia"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs text-slate-300">PIN / Senha (4+ díg.)</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Ex.: 4321"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Tipo de Conta</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as OsUserAccount['role'])}
                  className="w-full rounded-lg border border-white/15 bg-[#0B0F17] px-2.5 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Padrão">Padrão</option>
                  <option value="Convidado">Convidado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Perfil Inicial Vinculado</label>
              <select
                value={newPresetId}
                onChange={(e) => setNewPresetId(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0B0F17] px-2.5 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
              >
                {QUICK_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-300">Cor do Avatar</label>
              <div className="flex items-center gap-2">
                {ACCENT_SWATCHES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewColor(s.hex)}
                    className={`h-6 w-6 rounded-full border-2 ${
                      newColor === s.hex ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: s.hex }}
                  />
                ))}
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-sky-400 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-300"
            >
              Criar Conta e Entrar
            </button>
          </form>
        )}
      </motion.div>

      {/* Bottom User Account Selector */}
      <div className="relative z-10 mb-2 flex flex-wrap items-center justify-center gap-2.5">
        {users.map((u) => {
          const isSelected = u.id === selectedUser.id && !creatingNew;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setSelectedId(u.id);
                setCreatingNew(false);
                setPinInput('');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left backdrop-blur-md transition-colors ${
                isSelected
                  ? 'border-white/40 bg-white/15 text-white'
                  : 'border-white/10 bg-black/35 text-slate-300 hover:border-white/25 hover:bg-black/50'
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                style={{ backgroundColor: u.avatarColor }}
              >
                {u.initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{u.displayName}</div>
                <div className="truncate text-[10px] text-slate-400">
                  {u.config.visual.codename} · {u.config.operational.minRamMb} MB
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setCreatingNew(true);
            setErrorMsg(null);
          }}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 px-3.5 py-2.5 text-xs font-medium text-slate-200 backdrop-blur-md hover:border-sky-400/50 hover:text-white"
        >
          <UserPlus className="h-4 w-4 text-sky-400" />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Subtle Lock Footer */}
      <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Lock className="h-3 w-3" />
        <span>{osName} Vault Auth · Perfis isolados por Capability</span>
      </div>
    </motion.div>
  );
};
