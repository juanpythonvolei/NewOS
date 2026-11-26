import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { AetherConfig } from '../../types/aether';
import { AETHERLANG_TEMPLATES, analyzeAetherLang } from '../../engine/aetherLangAnalyzer';

interface AetherLangStudioProps {
  config: AetherConfig;
}

const LANGUAGE_CONSTRUCTS = [
  {
    keyword: 'module',
    purpose: 'Define o namespace hierárquico do módulo de kernel ou espaço de usuário.',
    contrast: 'Substitui #include de C/C++ por resolução determinística sem pré-processador.',
  },
  {
    keyword: 'capability',
    purpose: 'Declara permissões de hardware ou sistema com escopo estático verificável.',
    contrast: 'Elimina privilégios globais root/sudo ou ACLs legadas de POSIX/NT.',
  },
  {
    keyword: 'channel',
    purpose: 'Cria barramento IPC tipado em anel lock-free de cópia zero.',
    contrast: 'Substitui pipes, sockets Unix e COM/LPC por troca direta de referências.',
  },
  {
    keyword: 'own / borrow',
    purpose: 'Controla propriedade linear de memória em tempo de compilação sem coletor de lixo.',
    contrast: 'Garante uso previsível de RAM em PCs de 128 MB sem pausas de GC.',
  },
  {
    keyword: 'match / Result',
    purpose: 'Tratamento exaustivo de falhas de hardware e tradução de chamadas legadas.',
    contrast: 'Impede crashes silenciosos ou códigos errno ambíguos no microkernel.',
  },
];

export const AetherLangStudio: React.FC<AetherLangStudioProps> = ({ config }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(AETHERLANG_TEMPLATES[0].id);
  const [code, setCode] = useState(AETHERLANG_TEMPLATES[0].code);

  const analysis = useMemo(() => analyzeAetherLang(code, config), [code, config]);

  const handleSelectTemplate = (id: string) => {
    const found = AETHERLANG_TEMPLATES.find((t) => t.id === id);
    if (!found) return;
    setSelectedTemplateId(id);
    setCode(found.code);
  };

  const handleResetTemplate = () => {
    const found = AETHERLANG_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (found) setCode(found.code);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0B0F17] p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">
              Estúdio AetherLang (.aeth)
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Linguagem nativa de sistemas criada exclusivamente para o {config.visual.osName}.
              Edite módulos reais abaixo e valide a conformidade com o modelo de memória{' '}
              <span className="font-mono text-slate-200">{config.language.memoryModel}</span> e
              otimização <span className="font-mono text-slate-200">{config.language.optimization}</span>.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 tabular-nums">
            <span>Tokens: {analysis.tokenCount}</span>
            <span aria-hidden="true">·</span>
            <span>Binário est.: {analysis.estimatedBinaryKb} KB</span>
            <span aria-hidden="true">·</span>
            <span className={analysis.valid ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
              {analysis.valid ? 'Compilação Válida' : 'Erros Detectados'}
            </span>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#111827] p-1 border border-white/10">
            {AETHERLANG_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedTemplateId === tpl.id
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tpl.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleResetTemplate}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#111827] px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Exemplo</span>
          </button>
        </div>

        {/* Editor + Analyzer Split */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Editable Code Surface */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#111827] lg:col-span-7">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs">
              <span className="font-mono text-slate-200">{analysis.moduleName}.aeth</span>
              <span className="text-slate-400">
                Editor interativo · Teste remover &quot;own&quot; ou usar &quot;malloc(&quot;
              </span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={18}
              className="w-full flex-1 resize-none bg-[#090D14] p-4 font-mono text-xs leading-6 text-slate-100 focus:outline-none"
            />
          </div>

          {/* Real-time Diagnostics & AST Summary */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <div className="rounded-lg border border-white/10 bg-[#111827] p-4">
              <h2 className="text-sm font-semibold text-white">Diagnóstico do Compilador aethc</h2>
              <div className="mt-3 space-y-2.5">
                {analysis.diagnostics.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 border-b border-white/5 pb-2.5 last:border-b-0 last:pb-0 text-xs"
                  >
                    {d.severity === 'ok' && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    )}
                    {d.severity === 'warning' && (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    )}
                    {d.severity === 'error' && (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <div>
                      <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                        Linha {d.line}
                      </div>
                      <div className="mt-0.5 text-slate-200">{d.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#111827] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Símbolos Extraídos (AST)</h2>
              <div className="grid grid-cols-3 gap-3 border-b border-white/10 pb-3 text-xs">
                <div>
                  <div className="text-slate-400">Capabilities</div>
                  <div className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                    {analysis.capabilities.length}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Canais IPC</div>
                  <div className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                    {analysis.channels.length}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Funções</div>
                  <div className="mt-1 font-mono text-base font-semibold text-white tabular-nums">
                    {analysis.functions.length}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="text-slate-400">
                  Capabilities:{' '}
                  <span className="font-mono text-slate-200">
                    {analysis.capabilities.join(', ') || 'Nenhuma'}
                  </span>
                </div>
                <div className="text-slate-400">
                  Canais:{' '}
                  <span className="font-mono text-slate-200">
                    {analysis.channels.join(', ') || 'Nenhum'}
                  </span>
                </div>
                <div className="text-slate-400">
                  Funções:{' '}
                  <span className="font-mono text-slate-200">
                    {analysis.functions.join(', ') || 'Nenhuma'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Specification Reference Table */}
        <div className="rounded-lg border border-white/10 bg-[#111827]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">
              Primitivas Originais da AetherLang vs. Sistemas Legados
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Construto</th>
                  <th className="px-4 py-2.5 font-medium">Papel no {config.visual.osName}</th>
                  <th className="px-4 py-2.5 font-medium">Diferencial sobre POSIX / Win32 / Mach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LANGUAGE_CONSTRUCTS.map((row) => (
                  <tr key={row.keyword} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono font-medium text-sky-400 whitespace-nowrap">
                      {row.keyword}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{row.purpose}</td>
                    <td className="px-4 py-3 text-slate-400">{row.contrast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
