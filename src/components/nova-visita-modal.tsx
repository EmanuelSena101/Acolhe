"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";

export interface LockedDomicilio {
  id: string;
  /** Endereco legivel exibido no campo travado, ex: "Rua X, 123 · Centro" */
  label: string;
  /** ACS responsavel da microarea do domicilio, para pre-selecionar */
  acsId?: string;
}

interface NovaVisitaModalProps {
  prefeituraId: string;
  onClose: () => void;
  onCreated: () => void;
  /**
   * Quando informado, o domicilio ja vem escolhido e travado (fluxo a partir
   * da ficha do domicilio) — a cascata ACS > Microarea > Domicilio some e so
   * resta confirmar ACS responsavel, data e observacoes.
   */
  lockedDomicilio?: LockedDomicilio;
}

export function NovaVisitaModal({
  prefeituraId,
  onClose,
  onCreated,
  lockedDomicilio,
}: NovaVisitaModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const locked = !!lockedDomicilio;
  const [acsId, setAcsId] = useState(lockedDomicilio?.acsId ?? "");
  const [microareaId, setMicroareaId] = useState("");
  const [domicilioId, setDomicilioId] = useState(lockedDomicilio?.id ?? "");
  const [dataPrevista, setDataPrevista] = useState(today);
  const [observacoes, setObservacoes] = useState("");

  const { data: acsList } = trpc.acs.list.useQuery({ prefeituraId });

  const { data: microareasAcs } = trpc.microarea.list.useQuery(
    { acsId: acsId || undefined },
    { enabled: !!acsId && !locked },
  );

  const { data: domiciliosResp } = trpc.domicilio.list.useQuery(
    { microareaId: microareaId || undefined, perPage: 100 },
    { enabled: !!microareaId && !locked },
  );

  const domicilios = useMemo(() => domiciliosResp?.items ?? [], [domiciliosResp]);

  const registrarMutation = trpc.visita.registrar.useMutation({
    onSuccess: onCreated,
  });

  const canSubmit = !!acsId && !!domicilioId && !!dataPrevista && !registrarMutation.isPending;

  function submit() {
    if (!canSubmit) return;
    registrarMutation.mutate({
      acsId,
      domicilioId,
      dataPrevista: new Date(dataPrevista + "T00:00:00"),
      status: "PENDENTE",
      observacoes: observacoes.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(28,26,23,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{
          backgroundColor: "var(--acolhe-card)",
          border: "1px solid var(--acolhe-border)",
          boxShadow: "var(--acolhe-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-xl font-bold"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            Nova visita
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1"
            style={{ color: "var(--acolhe-muted-fg)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <ModalField label="ACS responsavel">
            <select
              value={acsId}
              onChange={(e) => {
                setAcsId(e.target.value);
                if (!locked) {
                  setMicroareaId("");
                  setDomicilioId("");
                }
              }}
              className="h-10 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                border: "1px solid var(--acolhe-border)",
                backgroundColor: "var(--acolhe-card)",
                color: "var(--acolhe-fg)",
              }}
            >
              <option value="">Selecione...</option>
              {acsList?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.usuario.nome} · {a.equipe.nome}
                </option>
              ))}
            </select>
          </ModalField>

          {locked ? (
            <ModalField label="Domicilio">
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{
                  border: "1px solid var(--acolhe-border)",
                  backgroundColor: "var(--acolhe-muted)",
                  color: "var(--acolhe-fg)",
                }}
              >
                {lockedDomicilio.label}
              </div>
            </ModalField>
          ) : (
            <>
              <ModalField label="Microarea">
                <select
                  value={microareaId}
                  onChange={(e) => {
                    setMicroareaId(e.target.value);
                    setDomicilioId("");
                  }}
                  disabled={!acsId}
                  className="h-10 w-full rounded-lg px-3 text-sm outline-none disabled:opacity-50"
                  style={{
                    border: "1px solid var(--acolhe-border)",
                    backgroundColor: "var(--acolhe-card)",
                    color: "var(--acolhe-fg)",
                  }}
                >
                  <option value="">{acsId ? "Selecione..." : "Escolha o ACS primeiro"}</option>
                  {microareasAcs?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo}
                    </option>
                  ))}
                </select>
              </ModalField>

              <ModalField label="Domicilio">
                <select
                  value={domicilioId}
                  onChange={(e) => setDomicilioId(e.target.value)}
                  disabled={!microareaId}
                  className="h-10 w-full rounded-lg px-3 text-sm outline-none disabled:opacity-50"
                  style={{
                    border: "1px solid var(--acolhe-border)",
                    backgroundColor: "var(--acolhe-card)",
                    color: "var(--acolhe-fg)",
                  }}
                >
                  <option value="">
                    {microareaId ? "Selecione..." : "Escolha a microarea primeiro"}
                  </option>
                  {domicilios.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.logradouro}, {d.numero} · {d.bairro}
                    </option>
                  ))}
                </select>
              </ModalField>
            </>
          )}

          <ModalField label="Data prevista">
            <input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="h-10 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                border: "1px solid var(--acolhe-border)",
                backgroundColor: "var(--acolhe-card)",
                color: "var(--acolhe-fg)",
              }}
            />
          </ModalField>

          <ModalField label="Observacoes (opcional)">
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex: Acompanhamento de pre-natal"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                border: "1px solid var(--acolhe-border)",
                backgroundColor: "var(--acolhe-card)",
                color: "var(--acolhe-fg)",
              }}
            />
          </ModalField>

          {registrarMutation.error && (
            <p
              className="rounded-md px-3 py-2 text-xs"
              style={{
                backgroundColor: "var(--acolhe-danger-light)",
                color: "var(--acolhe-danger)",
              }}
            >
              {registrarMutation.error.message}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg py-2 text-sm font-semibold"
            style={{
              border: "1px solid var(--acolhe-border)",
              backgroundColor: "var(--acolhe-card)",
              color: "var(--acolhe-fg)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--acolhe-primary)" }}
          >
            {registrarMutation.isPending ? "Criando..." : "Registrar visita"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--acolhe-muted-fg)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
