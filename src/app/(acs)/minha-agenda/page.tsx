"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapPin, Clock, AlertTriangle, ChevronRight, Plus } from "lucide-react";

function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface VisitaOrdem {
  ordem: number;
  domicilioId: string;
  logradouro: string;
  numero: string;
  prioridade: number;
  condicoes: string[];
}

const CONDICAO_COLORS: Record<string, string> = {
  gestante: "bg-pink-100 text-pink-800",
  hipertensao: "bg-red-100 text-red-800",
  hipertenso: "bg-red-100 text-red-800",
  diabetes: "bg-orange-100 text-orange-800",
  diabetico: "bg-orange-100 text-orange-800",
  idoso_acamado: "bg-purple-100 text-purple-800",
  acamado: "bg-purple-100 text-purple-800",
  tuberculose: "bg-yellow-100 text-yellow-800",
  hanseniase: "bg-amber-100 text-amber-800",
  doenca_respiratoria: "bg-teal-100 text-teal-800",
};

export default function MinhaAgendaPage() {
  const [dataAtual] = useState(() => new Date());
  const [selectedVisita, setSelectedVisita] = useState<VisitaOrdem | null>(null);

  const { data: session, isLoading: isSessionLoading } = trpc.auth.getSession.useQuery();

  const acsId = session?.user?.acsId;

  const { data: agenda, isLoading } = trpc.agenda.obter.useQuery(
    { acsId: acsId!, data: dataAtual },
    { enabled: !!acsId },
  );

  const utils = trpc.useUtils();

  const gerarMutation = trpc.agenda.gerar.useMutation({
    onSuccess: () => void utils.agenda.obter.invalidate(),
  });

  const visitasOrdem = (agenda?.visitasOrdem ?? []) as unknown as VisitaOrdem[];

  const handleGerar = () => {
    if (!acsId) return;
    gerarMutation.mutate({ acsId, data: dataAtual });
  };

  if (isLoading || isSessionLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-gray-500">Carregando agenda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm font-medium capitalize text-gray-600">{formatDateBR(dataAtual)}</p>
        {agenda && (
          <p className="mt-1 text-xs text-gray-400">{visitasOrdem.length} visitas programadas</p>
        )}
      </div>

      {/* Generate / Empty state */}
      {!agenda ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhuma agenda gerada para hoje.</p>
          <button
            onClick={handleGerar}
            disabled={gerarMutation.isPending}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {gerarMutation.isPending ? "Gerando..." : "Gerar agenda do dia"}
          </button>
        </div>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex gap-2">
            <a
              href="/novo-domicilio"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Cadastrar domicilio
            </a>
            <button
              onClick={handleGerar}
              disabled={gerarMutation.isPending}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Regerar
            </button>
          </div>

          {/* Visitas list */}
          <div className="space-y-2">
            {visitasOrdem.map((v) => (
              <button
                key={v.domicilioId}
                onClick={() => setSelectedVisita(v)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {v.ordem}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {v.logradouro}, {v.numero}
                  </p>
                  {v.condicoes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {v.condicoes.slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CONDICAO_COLORS[c.toLowerCase()] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {c}
                        </span>
                      ))}
                      {v.condicoes.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{v.condicoes.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                {v.prioridade > 0 && (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                )}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detail drawer */}
      {selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Visita #{selectedVisita.ordem}
              </h3>
              <button
                onClick={() => setSelectedVisita(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-700">
                  {selectedVisita.logradouro}, {selectedVisita.numero}
                </p>
              </div>

              {selectedVisita.condicoes.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Condicoes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVisita.condicoes.map((c, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONDICAO_COLORS[c.toLowerCase()] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={`/visita/${selectedVisita.domicilioId}`}
                className="mt-4 block w-full rounded-lg bg-green-600 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
              >
                Iniciar visita
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
