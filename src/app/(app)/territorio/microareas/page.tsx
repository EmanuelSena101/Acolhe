"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { MapPin, Plus, AlertCircle, Edit, Map as MapIcon, ListTodo, X, Trash2 } from "lucide-react";

const STATUS_PNAB = {
  valida: { label: "Valida", color: "var(--acolhe-success)", bg: "var(--acolhe-success-light)" },
  atencao: { label: "Atencao", color: "var(--acolhe-warning)", bg: "var(--acolhe-warning-light)" },
  critica: { label: "Critica", color: "var(--acolhe-danger)", bg: "var(--acolhe-danger-light)" },
} as const;

export default function MicroareasPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [ubsFilter, setUbsFilter] = useState<string>("all");
  const [equipeFilter, setEquipeFilter] = useState<string>("all");

  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: equipes } = trpc.equipe.listByPrefeitura.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: microareas, refetch } = trpc.microarea.listForGestao.useQuery(
    {
      prefeituraId: prefeituraId!,
      ubsId: ubsFilter === "all" ? undefined : ubsFilter,
      equipeId: equipeFilter === "all" ? undefined : equipeFilter,
    },
    { enabled: !!prefeituraId },
  );

  const utils = trpc.useUtils();

  const deleteMutation = trpc.microarea.delete.useMutation({
    onSuccess: () => {
      void utils.microarea.listForGestao.invalidate();
    },
  });

  function handleDelete(id: string, codigo: string) {
    if (confirm(`Excluir microarea ${codigo}?`)) {
      deleteMutation.mutate({ id });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--acolhe-primary-light)" }}
        >
          <MapPin size={20} style={{ color: "var(--acolhe-primary)" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold leading-tight"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            Microareas
          </h1>
          <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
            Configuracao e validacao da divisao territorial (PNAB)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={ubsFilter} onChange={setUbsFilter}>
          <option value="all">Todas as UBS</option>
          {ubsList?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={equipeFilter} onChange={setEquipeFilter}>
          <option value="all">Todas as equipes</option>
          {equipes
            ?.filter((eq) => ubsFilter === "all" || eq.ubs.id === ubsFilter)
            .map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nome}
              </option>
            ))}
        </FilterSelect>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 transition-all hover:bg-[var(--acolhe-muted)]"
          style={{
            border: "2px dashed var(--acolhe-border)",
            backgroundColor: "transparent",
            minHeight: 280,
          }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--acolhe-primary-light)" }}
          >
            <Plus size={20} style={{ color: "var(--acolhe-primary)" }} />
          </div>
          <p
            className="text-sm font-semibold"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            Adicionar microarea
          </p>
        </button>

        {microareas?.map((m) => (
          <MicroareaCard key={m.id} microarea={m} onDelete={() => handleDelete(m.id, m.codigo)} />
        ))}
      </div>

      {!microareas && (
        <p className="text-center text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
          Carregando...
        </p>
      )}

      {microareas && microareas.length === 0 && (
        <p className="text-center text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
          Nenhuma microarea encontrada com os filtros atuais
        </p>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          equipes={equipes ?? []}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

interface MicroareaForGestao {
  id: string;
  codigo: string;
  populacaoEstimada: number;
  validada: boolean;
  equipe: { id: string; nome: string; cor: string };
  ubs: { id: string; nome: string };
  acs: { id: string; nome: string } | null;
  totalDomicilios: number;
  domiciliosVisitados: number;
  cobertura: number;
  statusPNAB: "valida" | "atencao" | "critica";
  excedePNAB: boolean;
}

interface EquipeOption {
  id: string;
  nome: string;
  cor: string;
  ubs: { id: string; nome: string };
}

interface MicroareaCardProps {
  microarea: MicroareaForGestao;
  onDelete: () => void;
}

function MicroareaCard({ microarea: m, onDelete }: MicroareaCardProps) {
  const statusConfig = STATUS_PNAB[m.statusPNAB];
  const acsAvatar = m.acs?.nome ? getInitials(m.acs.nome) : "—";

  return (
    <div
      className="group overflow-hidden rounded-xl transition-all hover:shadow-md"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        borderLeft: `4px solid ${m.equipe.cor}`,
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      {m.excedePNAB && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          style={{
            backgroundColor: "var(--acolhe-danger-light)",
            color: "var(--acolhe-danger)",
          }}
        >
          <AlertCircle size={14} />
          Populacao excede 750 — divida em 2 microareas
        </div>
      )}

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <p
            className="text-2xl font-bold leading-none"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            {m.codigo}
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: m.equipe.cor }}
          >
            {acsAvatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
              {m.acs?.nome ?? "Sem ACS atribuido"}
            </p>
            {!m.acs && (
              <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                Atribua um ACS
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-full px-2 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "var(--acolhe-primary-light)",
              color: "var(--acolhe-primary)",
            }}
          >
            {m.equipe.nome}
          </span>
          <span
            className="rounded-full px-2 py-1 text-xs"
            style={{
              backgroundColor: "var(--acolhe-muted)",
              color: "var(--acolhe-muted-fg)",
            }}
          >
            {m.ubs.nome}
          </span>
        </div>

        <div
          className="grid grid-cols-3 gap-2 pt-3"
          style={{ borderTop: "1px solid var(--acolhe-border)" }}
        >
          <Metric value={m.totalDomicilios} label="Domicilios" />
          <Metric value={m.populacaoEstimada} label="Populacao" />
          <Metric value={`${m.cobertura}%`} label="Cobertura" />
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--acolhe-muted)" }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(m.cobertura, 100)}%`,
              backgroundColor: "var(--acolhe-success)",
            }}
          />
        </div>

        <div
          className="flex gap-2 pt-3 opacity-60 transition-opacity group-hover:opacity-100"
          style={{ borderTop: "1px solid var(--acolhe-border)" }}
        >
          <Link
            href={`/territorio?microareaId=${m.id}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: "var(--acolhe-card)",
              border: "1px solid var(--acolhe-border)",
              color: "var(--acolhe-fg)",
            }}
          >
            <MapIcon size={12} />
            Mapa
          </Link>
          <Link
            href={`/domicilios?microareaId=${m.id}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: "var(--acolhe-card)",
              border: "1px solid var(--acolhe-border)",
              color: "var(--acolhe-fg)",
            }}
          >
            <ListTodo size={12} />
            Lista
          </Link>
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-md p-1.5 transition-colors"
            style={{
              backgroundColor: "var(--acolhe-card)",
              border: "1px solid var(--acolhe-border)",
              color: "var(--acolhe-muted-fg)",
            }}
            title="Excluir microarea"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--acolhe-danger)";
              e.currentTarget.style.borderColor = "var(--acolhe-danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--acolhe-muted-fg)";
              e.currentTarget.style.borderColor = "var(--acolhe-border)";
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p
        className="text-xl font-bold leading-none"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px]" style={{ color: "var(--acolhe-muted-fg)" }}>
        {label}
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (_v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg px-3 text-sm outline-none"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        color: "var(--acolhe-fg)",
      }}
    >
      {children}
    </select>
  );
}

interface CreateModalProps {
  equipes: EquipeOption[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ equipes, onClose, onCreated }: CreateModalProps) {
  const [codigo, setCodigo] = useState("");
  const [equipeId, setEquipeId] = useState("");

  const createMutation = trpc.microarea.create.useMutation({
    onSuccess: onCreated,
  });

  const canSubmit = codigo.trim().length > 0 && equipeId !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
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
            Nova microarea
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
          <Field label="Codigo">
            <input
              type="text"
              placeholder="Ex: MA-05"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              maxLength={10}
              className="h-10 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                border: "1px solid var(--acolhe-border)",
                backgroundColor: "var(--acolhe-card)",
                color: "var(--acolhe-fg)",
              }}
            />
          </Field>

          <Field label="Equipe ESF">
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value)}
              className="h-10 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                border: "1px solid var(--acolhe-border)",
                backgroundColor: "var(--acolhe-card)",
                color: "var(--acolhe-fg)",
              }}
            >
              <option value="">Selecione...</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome} · {eq.ubs.nome}
                </option>
              ))}
            </select>
          </Field>

          {createMutation.error && (
            <p
              className="rounded-md px-3 py-2 text-xs"
              style={{
                backgroundColor: "var(--acolhe-danger-light)",
                color: "var(--acolhe-danger)",
              }}
            >
              {createMutation.error.message}
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
            onClick={() => createMutation.mutate({ equipeId, codigo: codigo.trim() })}
            disabled={!canSubmit || createMutation.isPending}
            className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--acolhe-primary)" }}
          >
            {createMutation.isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
