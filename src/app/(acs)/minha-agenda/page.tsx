"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  Navigation,
  Phone,
  ClipboardList,
  User,
  AlertCircle,
  Heart,
  Pill,
  Activity,
  Baby,
  Loader2,
  Calendar,
  Users as UsersIcon,
} from "lucide-react";

const CONDICAO_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  HIPERTENSO: { label: "Hipertenso", color: "#BE123C", bg: "#FEE2E2", icon: Activity },
  hipertenso: { label: "Hipertenso", color: "#BE123C", bg: "#FEE2E2", icon: Activity },
  hipertensao: { label: "Hipertenso", color: "#BE123C", bg: "#FEE2E2", icon: Activity },
  DIABETICO: { label: "Diabetico", color: "#7E22CE", bg: "#F3E8FF", icon: Pill },
  diabetico: { label: "Diabetico", color: "#7E22CE", bg: "#F3E8FF", icon: Pill },
  diabetes: { label: "Diabetico", color: "#7E22CE", bg: "#F3E8FF", icon: Pill },
  GESTANTE: { label: "Gestante", color: "#0F766E", bg: "#CCFBF1", icon: Heart },
  gestante: { label: "Gestante", color: "#0F766E", bg: "#CCFBF1", icon: Heart },
  BEBE: { label: "Bebe", color: "#D97706", bg: "#FEF3C7", icon: Baby },
  ACAMADO: { label: "Acamado", color: "#1D4ED8", bg: "#DBEAFE", icon: User },
  acamado: { label: "Acamado", color: "#1D4ED8", bg: "#DBEAFE", icon: User },
  idoso_acamado: { label: "Idoso acamado", color: "#1D4ED8", bg: "#DBEAFE", icon: User },
  CARDIACO: { label: "Cardiaco", color: "#BE123C", bg: "#FEE2E2", icon: Heart },
};

interface VisitaCard {
  ordem: number;
  domicilioId: string;
  logradouro: string;
  numero: string;
  bairro: string;
  prioridade: number;
  condicoes: string[];
  moradorPrincipal: { nome: string; idade: number | null } | null;
  statusUI: "concluida" | "pendente";
  horario: string | null;
  visitaId: string | null;
}

export default function MinhaAgendaPage() {
  const [dataAtual] = useState(() => new Date());
  const [selected, setSelected] = useState<VisitaCard | null>(null);

  const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
  const acsId = session?.user?.acsId;

  const utils = trpc.useUtils();

  const { data: agenda, isLoading: agendaLoading } = trpc.agenda.obter.useQuery(
    { acsId: acsId!, data: dataAtual },
    { enabled: !!acsId },
  );

  const gerarMutation = trpc.agenda.gerar.useMutation({
    onSuccess: () => void utils.agenda.obter.invalidate(),
  });

  const registrarMutation = trpc.visita.registrar.useMutation({
    onSuccess: () => {
      void utils.agenda.obter.invalidate();
      setSelected(null);
    },
  });

  const visitas = ((agenda?.visitas ?? []) as VisitaCard[]).map((v) => ({
    ...v,
    condicoes: Array.isArray(v.condicoes) ? v.condicoes : [],
  }));
  const concluidas = visitas.filter((v) => v.statusUI === "concluida").length;
  const total = visitas.length;
  const progress = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  function handleCheguei(v: VisitaCard) {
    if (!acsId) return;
    if (!("geolocation" in navigator)) {
      void registrarMutation.mutateAsync({
        acsId,
        domicilioId: v.domicilioId,
        dataPrevista: dataAtual,
        status: "REALIZADA",
        dataRealizada: new Date(),
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        registrarMutation.mutate({
          acsId,
          domicilioId: v.domicilioId,
          dataPrevista: dataAtual,
          status: "REALIZADA",
          dataRealizada: new Date(),
          latCheckin: pos.coords.latitude,
          lngCheckin: pos.coords.longitude,
        });
      },
      () => {
        registrarMutation.mutate({
          acsId,
          domicilioId: v.domicilioId,
          dataPrevista: dataAtual,
          status: "REALIZADA",
          dataRealizada: new Date(),
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (sessionLoading || (acsId && agendaLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--acolhe-primary)" }} />
      </div>
    );
  }

  const equipeNome = agenda?.acs?.equipe?.nome ?? "";
  const equipeCor = agenda?.acs?.equipe?.cor ?? "#1B4F6B";

  const dataLabel = dataAtual.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex min-h-screen flex-col" style={{ position: "relative" }}>
      {/* Header (gradient azul-petróleo, espaço pra hamburger no mobile) */}
      <header
        className="flex-shrink-0 px-4 pb-5 pl-16 pt-5 lg:rounded-b-2xl lg:px-6 lg:pl-6 lg:pt-6"
        style={{ backgroundColor: "var(--acolhe-primary)" }}
      >
        <p className="text-xs font-medium capitalize" style={{ color: "rgba(232,241,246,0.75)" }}>
          {dataLabel}
          {equipeNome ? ` · ${equipeNome}` : ""}
        </p>
        <h1
          className="mt-0.5 text-xl font-bold text-white lg:text-2xl"
          style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
        >
          Agenda de hoje
        </h1>

        {agenda && total > 0 && (
          <div className="mt-4 space-y-1.5 lg:max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">
                {concluidas} de {total} {total === 1 ? "visita" : "visitas"}
              </span>
              <span className="text-xs font-semibold text-white">{progress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: "white" }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-24">
        {!acsId && <EmptyMsg>Sem ACS associado ao seu usuario.</EmptyMsg>}

        {acsId && !agenda && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--acolhe-primary-light)" }}
            >
              <Clock size={32} style={{ color: "var(--acolhe-primary)" }} />
            </div>
            <h3
              className="text-lg font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Sem agenda gerada
            </h3>
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Gere a agenda do dia para comecar
            </p>
            <button
              onClick={() => gerarMutation.mutate({ acsId, data: dataAtual })}
              disabled={gerarMutation.isPending}
              className="mt-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{
                backgroundColor: "var(--acolhe-primary)",
                boxShadow: "var(--acolhe-shadow-sm)",
              }}
            >
              {gerarMutation.isPending ? "Gerando..." : "Gerar agenda do dia"}
            </button>
          </div>
        )}

        {acsId && agenda && total === 0 && (
          <EmptyMsg>Nenhuma visita necessaria hoje. Bom descanso!</EmptyMsg>
        )}

        {acsId && agenda && total > 0 && (
          <div className="space-y-3 px-4 pt-4">
            {visitas.map((v) => (
              <VisitaListCard
                key={v.domicilioId}
                visita={v}
                equipeCor={equipeCor}
                onClick={() => setSelected(v)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom nav (mobile only — desktop uses sidebar) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-4 py-3 lg:hidden"
        style={{
          backgroundColor: "var(--acolhe-card)",
          borderTop: "1px solid var(--acolhe-border)",
          boxShadow: "0 -4px 12px rgba(28,26,23,0.06)",
        }}
      >
        <BottomNavItem icon={ClipboardList} label="Agenda" active />
        <BottomNavItem icon={MapPin} label="Mapa" />
        <BottomNavItem icon={UsersIcon} label="Familias" />
        <BottomNavItem icon={CheckCircle2} label="Registro" />
      </nav>

      {/* Drawer */}
      {selected && (
        <VisitaDrawer
          visita={selected}
          onClose={() => setSelected(null)}
          onCheguei={() => handleCheguei(selected)}
          isPending={registrarMutation.isPending}
        />
      )}
    </div>
  );
}

function VisitaListCard({
  visita: v,
  equipeCor,
  onClick,
}: {
  visita: VisitaCard;
  equipeCor: string;
  onClick: () => void;
}) {
  const isDone = v.statusUI === "concluida";

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl p-4 text-left transition-all active:scale-[0.99]"
      style={{
        backgroundColor: isDone ? "var(--acolhe-muted)" : "var(--acolhe-card)",
        border: `1px solid var(--acolhe-border)`,
        boxShadow: "var(--acolhe-shadow-sm)",
        opacity: isDone ? 0.75 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex flex-col items-center gap-1">
          {isDone ? (
            <CheckCircle2 size={22} style={{ color: "var(--acolhe-success)" }} />
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: "var(--acolhe-muted)",
                color: "var(--acolhe-muted-fg)",
                border: "1.5px solid var(--acolhe-border)",
              }}
            >
              {v.ordem}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-1.5">
            <MapPin
              size={13}
              style={{
                color: "var(--acolhe-muted-fg)",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold leading-tight"
                style={{ color: "var(--acolhe-fg)" }}
              >
                {v.logradouro}, {v.numero}
              </p>
              {v.bairro && (
                <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                  {v.bairro}
                </p>
              )}
            </div>
          </div>

          {v.moradorPrincipal && (
            <p className="text-sm font-medium leading-tight" style={{ color: "var(--acolhe-fg)" }}>
              {v.moradorPrincipal.nome}
              {v.moradorPrincipal.idade !== null && (
                <span
                  className="ml-1 text-xs font-normal"
                  style={{ color: "var(--acolhe-muted-fg)" }}
                >
                  {v.moradorPrincipal.idade} anos
                </span>
              )}
            </p>
          )}

          {v.condicoes.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {v.condicoes.slice(0, 4).map((c) => {
                const meta = CONDICAO_META[c] ?? {
                  label: c,
                  color: "var(--acolhe-muted-fg)",
                  bg: "var(--acolhe-muted)",
                  icon: User,
                };
                const Icon = meta.icon;
                return (
                  <span
                    key={c}
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <Icon size={9} />
                    {meta.label}
                  </span>
                );
              })}
              {v.condicoes.length > 4 && (
                <span className="text-[10px]" style={{ color: "var(--acolhe-muted-fg)" }}>
                  +{v.condicoes.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {v.horario && (
            <div className="flex items-center gap-1">
              <Clock size={11} style={{ color: "var(--acolhe-muted-fg)" }} />
              <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {v.horario}
              </span>
            </div>
          )}
          {v.prioridade > 0 && (
            <AlertCircle size={14} style={{ color: equipeCor }} aria-label="Visita prioritaria" />
          )}
          <ChevronRight size={14} style={{ color: "var(--acolhe-muted-fg)" }} />
        </div>
      </div>
    </button>
  );
}

function VisitaDrawer({
  visita: v,
  onClose,
  onCheguei,
  isPending,
}: {
  visita: VisitaCard;
  onClose: () => void;
  onCheguei: () => void;
  isPending: boolean;
}) {
  const isDone = v.statusUI === "concluida";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(28,26,23,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-2xl rounded-t-2xl lg:left-60 lg:max-w-2xl"
        style={{
          backgroundColor: "var(--acolhe-card)",
          boxShadow: "0 -8px 32px rgba(28,26,23,0.18)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: "var(--acolhe-border)" }}
          />
        </div>

        <div
          className="flex flex-shrink-0 items-start justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--acolhe-border)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={
                  isDone
                    ? {
                        backgroundColor: "var(--acolhe-success-light)",
                        color: "var(--acolhe-success)",
                      }
                    : {
                        backgroundColor: "var(--acolhe-muted)",
                        color: "var(--acolhe-muted-fg)",
                      }
                }
              >
                {isDone ? "Concluida" : "Pendente"}
              </span>
              <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                Visita {v.ordem}
              </span>
            </div>
            <h2
              className="truncate text-base font-bold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              {v.moradorPrincipal?.nome ?? `${v.logradouro}, ${v.numero}`}
            </h2>
            {v.moradorPrincipal?.idade !== null && v.moradorPrincipal && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {v.moradorPrincipal.idade} anos
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: "var(--acolhe-muted)",
              color: "var(--acolhe-muted-fg)",
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <DrawerInfoRow
            icon={MapPin}
            label="Endereco"
            value={`${v.logradouro}, ${v.numero}${v.bairro ? ` · ${v.bairro}` : ""}`}
          />

          {v.condicoes.length > 0 && (
            <div>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--acolhe-muted-fg)" }}
              >
                Condicoes de saude
              </p>
              <div className="flex flex-wrap gap-2">
                {v.condicoes.map((c) => {
                  const meta = CONDICAO_META[c] ?? {
                    label: c,
                    color: "var(--acolhe-muted-fg)",
                    bg: "var(--acolhe-muted)",
                    icon: User,
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={c}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <Icon size={13} style={{ color: meta.color }} />
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {v.prioridade > 0 && !isDone && (
            <div
              className="flex items-start gap-2 rounded-lg p-3"
              style={{
                backgroundColor: "var(--acolhe-warning-light)",
                border: "1px solid rgba(180,83,9,0.15)",
              }}
            >
              <AlertCircle
                size={14}
                style={{
                  color: "var(--acolhe-warning)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <p className="text-sm" style={{ color: "var(--acolhe-fg)" }}>
                Visita prioritaria — atender antes
              </p>
            </div>
          )}

          {v.horario && <DrawerInfoRow icon={Clock} label="Realizada as" value={v.horario} />}

          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={Navigation} label="Navegar" />
            <QuickAction icon={Phone} label="Ligar" />
            <QuickAction icon={ClipboardList} label="Registrar" />
            <QuickAction icon={AlertCircle} label="Alertar" />
          </div>
        </div>

        <div
          className="flex-shrink-0 px-5 pb-8 pt-4"
          style={{ borderTop: "1px solid var(--acolhe-border)" }}
        >
          {isDone ? (
            <div
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold"
              style={{
                backgroundColor: "var(--acolhe-success-light)",
                color: "var(--acolhe-success)",
              }}
            >
              <CheckCircle2 size={20} />
              Visita concluida
            </div>
          ) : (
            <button
              onClick={onCheguei}
              disabled={isPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                backgroundColor: "var(--acolhe-success)",
                boxShadow: "0 4px 16px rgba(15,118,110,0.35)",
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={22} />
                  Cheguei
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--acolhe-muted)" }}
      >
        <Icon size={15} style={{ color: "var(--acolhe-primary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--acolhe-muted-fg)" }}
        >
          {label}
        </p>
        <p className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.97]"
      style={{
        backgroundColor: "var(--acolhe-muted)",
        color: "var(--acolhe-fg)",
        border: "1px solid var(--acolhe-border)",
      }}
    >
      <Icon size={15} style={{ color: "var(--acolhe-primary)" }} />
      {label}
    </button>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className="flex flex-col items-center gap-1 px-3 py-1"
      style={{
        color: active ? "var(--acolhe-primary)" : "var(--acolhe-muted-fg)",
      }}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--acolhe-muted)" }}
      >
        <Calendar size={24} style={{ color: "var(--acolhe-muted-fg)" }} />
      </div>
      <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
        {children}
      </p>
    </div>
  );
}
