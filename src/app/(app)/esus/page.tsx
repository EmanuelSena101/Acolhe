"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpDown,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  FileText,
  Zap,
  Clock,
} from "lucide-react";

type ImportTipo =
  | "AUTO"
  | "ESUS_CSV_FICHA_A"
  | "ESUS_CSV_FICHA_B"
  | "ESUS_CSV_VISITA"
  | "ESUS_XML"
  | "ESUS_ZIP";

type Periodo = "ultimos_30" | "ultimos_90" | "mes_atual" | "all";
type ExportFormat = "csv" | "xml";
type ExportTipoUI = "domicilios" | "visitas" | "cobertura" | "completa";

type StatusJob = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "CONCLUIDO_COM_ERROS" | "ERRO";

const STATUS_CONFIG: Record<
  StatusJob,
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  PENDENTE: {
    label: "Pendente",
    color: "var(--acolhe-muted-fg)",
    bg: "var(--acolhe-muted)",
    icon: Clock,
  },
  PROCESSANDO: {
    label: "Processando",
    color: "var(--acolhe-primary)",
    bg: "var(--acolhe-primary-light)",
    icon: Loader2,
  },
  CONCLUIDO: {
    label: "Concluido",
    color: "var(--acolhe-success)",
    bg: "var(--acolhe-success-light)",
    icon: CheckCircle,
  },
  CONCLUIDO_COM_ERROS: {
    label: "Com erros",
    color: "var(--acolhe-warning)",
    bg: "var(--acolhe-warning-light)",
    icon: AlertTriangle,
  },
  ERRO: {
    label: "Erro",
    color: "var(--acolhe-danger)",
    bg: "var(--acolhe-danger-light)",
    icon: XCircle,
  },
};

const EXPORT_TIPOS: { id: ExportTipoUI; label: string; desc: string }[] = [
  { id: "domicilios", label: "Domicilios e moradores", desc: "CSV / XML" },
  { id: "visitas", label: "Visitas do periodo", desc: "CSV / XML" },
  { id: "cobertura", label: "Cobertura por microarea", desc: "CSV / XML" },
  { id: "completa", label: "Exportacao completa e-SUS APS", desc: "Recomendado" },
];

function periodoToRange(p: Periodo): { dataInicio?: Date; dataFim?: Date } {
  const now = new Date();
  if (p === "all") return {};
  if (p === "mes_atual") {
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { dataInicio: inicio, dataFim: fim };
  }
  const dias = p === "ultimos_30" ? 30 : 90;
  const inicio = new Date(now);
  inicio.setDate(inicio.getDate() - dias);
  return { dataInicio: inicio, dataFim: now };
}

export default function EsusPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--acolhe-primary-light)" }}
        >
          <ArrowUpDown size={20} style={{ color: "var(--acolhe-primary)" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold leading-tight"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            Importar / Exportar e-SUS APS
          </h1>
          <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
            Compatibilidade bidirecional com e-SUS APS PEC oficial
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportSection />
        <ExportSection />
      </div>
    </div>
  );
}

/* ============================================================
   IMPORT
   ============================================================ */

function ImportSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<ImportTipo>("AUTO");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [validationMsg, setValidationMsg] = useState<{
    kind: "ok" | "warning" | "error";
    msg: string;
  } | null>(null);

  const { data: jobs, refetch } = trpc.importacao.listarMeus.useQuery({ limit: 5 });

  const iniciarMutation = trpc.importacao.iniciar.useMutation({
    onSuccess: () => {
      setStagedFile(null);
      setValidationMsg(null);
      void refetch();
    },
  });

  const validateFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const okExt = ["csv", "xml", "zip"];
    if (!ext || !okExt.includes(ext)) {
      setValidationMsg({
        kind: "error",
        msg: "Formato nao suportado — use CSV, XML ou ZIP",
      });
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      setValidationMsg({
        kind: "error",
        msg: "Arquivo excede o limite de 100 MB",
      });
      return false;
    }
    setValidationMsg({
      kind: "ok",
      msg: "Estrutura e formato validos para importacao",
    });
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setStagedFile(file);
      validateFile(file);
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = useCallback(async () => {
    if (!stagedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", stagedFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Falha no upload");
      const { uploadId, fileName, size } = (await res.json()) as {
        uploadId: string;
        fileName: string;
        size: number;
      };
      iniciarMutation.mutate({
        uploadId,
        fileName: fileName || stagedFile.name,
        fileSize: size || stagedFile.size,
        tipo,
      });
    } catch {
      setValidationMsg({
        kind: "error",
        msg: "Erro ao enviar o arquivo. Tente novamente.",
      });
    } finally {
      setUploading(false);
    }
  }, [stagedFile, tipo, iniciarMutation]);

  return (
    <section className="space-y-4">
      <h2
        className="text-lg font-bold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        Importar
      </h2>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-8 text-center transition-colors"
        style={{
          border: `2px dashed ${isDragging ? "var(--acolhe-primary)" : "var(--acolhe-border)"}`,
          backgroundColor: isDragging ? "var(--acolhe-primary-light)" : "var(--acolhe-card)",
        }}
      >
        {!stagedFile ? (
          <>
            <Upload size={32} style={{ color: "var(--acolhe-primary)" }} />
            <div>
              <p className="font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                Arraste o arquivo do e-SUS aqui
              </p>
              <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
                ou clique para selecionar
              </p>
            </div>
            <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
              Aceitos: .csv .xml .zip (ate 100 MB)
            </p>
          </>
        ) : (
          <>
            <CheckCircle size={32} style={{ color: "var(--acolhe-success)" }} />
            <div>
              <p className="font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                {stagedFile.name}
              </p>
              <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {(stagedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </>
        )}
        <input
          type="file"
          accept=".csv,.xml,.zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {validationMsg && (
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3"
          style={{
            backgroundColor:
              validationMsg.kind === "ok"
                ? "var(--acolhe-success-light)"
                : validationMsg.kind === "warning"
                  ? "var(--acolhe-warning-light)"
                  : "var(--acolhe-danger-light)",
          }}
        >
          {validationMsg.kind === "ok" ? (
            <CheckCircle size={18} style={{ color: "var(--acolhe-success)" }} />
          ) : (
            <AlertCircle
              size={18}
              style={{
                color:
                  validationMsg.kind === "warning"
                    ? "var(--acolhe-warning)"
                    : "var(--acolhe-danger)",
              }}
            />
          )}
          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  validationMsg.kind === "ok"
                    ? "var(--acolhe-success)"
                    : validationMsg.kind === "warning"
                      ? "var(--acolhe-warning)"
                      : "var(--acolhe-danger)",
              }}
            >
              {validationMsg.kind === "ok"
                ? "Arquivo valido"
                : validationMsg.kind === "warning"
                  ? "Atencao"
                  : "Arquivo invalido"}
            </p>
            <p
              className="text-xs"
              style={{
                color:
                  validationMsg.kind === "ok"
                    ? "var(--acolhe-success)"
                    : validationMsg.kind === "warning"
                      ? "var(--acolhe-warning)"
                      : "var(--acolhe-danger)",
              }}
            >
              {validationMsg.msg}
            </p>
          </div>
        </div>
      )}

      {stagedFile && validationMsg?.kind === "ok" && (
        <div className="flex items-center gap-3">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ImportTipo)}
            className="h-10 flex-1 rounded-lg px-3 text-sm outline-none"
            style={{
              border: "1px solid var(--acolhe-border)",
              backgroundColor: "var(--acolhe-card)",
              color: "var(--acolhe-fg)",
            }}
          >
            <option value="AUTO">Auto-detectar</option>
            <option value="ESUS_CSV_FICHA_A">Ficha A (Domicilios)</option>
            <option value="ESUS_CSV_FICHA_B">Ficha B (Moradores)</option>
            <option value="ESUS_CSV_VISITA">Ficha de visita</option>
            <option value="ESUS_XML">XML (pacote)</option>
            <option value="ESUS_ZIP">ZIP (pacote completo)</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={uploading || iniciarMutation.isPending}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{
              backgroundColor: "var(--acolhe-primary)",
              boxShadow: "var(--acolhe-shadow-sm)",
            }}
          >
            {uploading || iniciarMutation.isPending ? "Processando..." : "Processar importacao"}
          </button>
        </div>
      )}

      <div className="pt-4" style={{ borderTop: "1px solid var(--acolhe-border)" }}>
        <h3
          className="mb-3 text-sm font-semibold"
          style={{
            fontFamily: "var(--font-plus-jakarta), sans-serif",
            color: "var(--acolhe-fg)",
          }}
        >
          Historico (ultimas 5)
        </h3>
        <div className="space-y-2">
          {jobs?.map((job) => {
            const cfg = STATUS_CONFIG[job.status as StatusJob];
            const Icon = cfg.icon;
            const total = job.totalLinhas ?? 0;
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                }}
              >
                <Icon
                  size={18}
                  style={{
                    color: cfg.color,
                    animation: job.status === "PROCESSANDO" ? "spin 2s linear infinite" : undefined,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--acolhe-fg)" }}
                  >
                    {job.arquivoNome}
                  </p>
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {new Date(job.criadoEm).toLocaleDateString("pt-BR")}
                    {total > 0 && ` · ${total} registros`}
                    {(job.totalSucesso > 0 || job.totalErro > 0) &&
                      ` · ${job.totalSucesso} OK, ${job.totalErro} erros`}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
          {(!jobs || jobs.length === 0) && (
            <p className="py-4 text-center text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
              Nenhuma importacao realizada
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   EXPORT
   ============================================================ */

function ExportSection() {
  const [tipo, setTipo] = useState<ExportTipoUI>("completa");
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [ubsId, setUbsId] = useState<string>("all");
  const [equipeId, setEquipeId] = useState<string>("all");
  const [format, setFormat] = useState<ExportFormat>("csv");

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

  const { data: jobs, refetch } = trpc.exportacao.listar.useQuery({ limit: 5 });

  const csvMutation = trpc.exportacao.gerarCSV.useMutation({
    onSuccess: () => void refetch(),
  });
  const xmlMutation = trpc.exportacao.gerarXML.useMutation({
    onSuccess: () => void refetch(),
  });

  function handleGerar() {
    const range = periodoToRange(periodo);
    const input = {
      ubsId: ubsId === "all" ? undefined : ubsId,
      equipeId: equipeId === "all" ? undefined : equipeId,
      ...range,
    };
    if (format === "csv") {
      csvMutation.mutate(input);
    } else {
      xmlMutation.mutate(input);
    }
  }

  const isPending = csvMutation.isPending || xmlMutation.isPending;

  return (
    <section className="space-y-4">
      <h2
        className="text-lg font-bold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        Exportar
      </h2>

      <div className="space-y-2">
        <p className="text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
          Tipo de exportacao
        </p>
        {EXPORT_TIPOS.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all"
            style={{
              border: `1px solid ${
                tipo === t.id ? "var(--acolhe-primary)" : "var(--acolhe-border)"
              }`,
              backgroundColor: tipo === t.id ? "var(--acolhe-primary-light)" : "var(--acolhe-card)",
            }}
          >
            <input
              type="radio"
              name="exportTipo"
              value={t.id}
              checked={tipo === t.id}
              onChange={() => setTipo(t.id)}
              className="h-4 w-4"
              style={{ accentColor: "var(--acolhe-primary)" }}
            />
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{
                  color: tipo === t.id ? "var(--acolhe-primary)" : "var(--acolhe-fg)",
                }}
              >
                {t.label}
              </p>
              <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {t.desc}
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--acolhe-border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
          Filtros
        </p>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="h-10 w-full rounded-lg px-3 text-sm outline-none"
          style={{
            border: "1px solid var(--acolhe-border)",
            backgroundColor: "var(--acolhe-card)",
            color: "var(--acolhe-fg)",
          }}
        >
          <option value="mes_atual">Periodo: mes atual</option>
          <option value="ultimos_30">Periodo: ultimos 30 dias</option>
          <option value="ultimos_90">Periodo: ultimos 90 dias</option>
          <option value="all">Periodo: todo o periodo</option>
        </select>
        <select
          value={ubsId}
          onChange={(e) => {
            setUbsId(e.target.value);
            setEquipeId("all");
          }}
          className="h-10 w-full rounded-lg px-3 text-sm outline-none"
          style={{
            border: "1px solid var(--acolhe-border)",
            backgroundColor: "var(--acolhe-card)",
            color: "var(--acolhe-fg)",
          }}
        >
          <option value="all">UBS: todas</option>
          {ubsList?.map((u) => (
            <option key={u.id} value={u.id}>
              UBS: {u.nome}
            </option>
          ))}
        </select>
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
          <option value="all">Equipe: todas</option>
          {equipes
            ?.filter((eq) => ubsId === "all" || eq.ubs.id === ubsId)
            .map((eq) => (
              <option key={eq.id} value={eq.id}>
                Equipe: {eq.nome}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-2 pt-4" style={{ borderTop: "1px solid var(--acolhe-border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
          Formato
        </p>
        <div className="flex gap-2">
          {(["csv", "xml"] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className="h-10 flex-1 rounded-lg text-sm font-semibold transition-all"
              style={{
                border: `1px solid ${
                  format === fmt ? "var(--acolhe-primary)" : "var(--acolhe-border)"
                }`,
                backgroundColor: format === fmt ? "var(--acolhe-primary)" : "var(--acolhe-card)",
                color: format === fmt ? "#FFFFFF" : "var(--acolhe-fg)",
              }}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGerar}
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{
          backgroundColor: "var(--acolhe-primary)",
          boxShadow: "var(--acolhe-shadow-sm)",
        }}
      >
        <Zap size={16} />
        {isPending ? "Gerando..." : "Gerar exportacao"}
      </button>

      {(csvMutation.error || xmlMutation.error) && (
        <p
          className="rounded-md px-3 py-2 text-xs"
          style={{
            backgroundColor: "var(--acolhe-danger-light)",
            color: "var(--acolhe-danger)",
          }}
        >
          {(csvMutation.error ?? xmlMutation.error)?.message}
        </p>
      )}

      <div className="pt-4" style={{ borderTop: "1px solid var(--acolhe-border)" }}>
        <h3
          className="mb-3 text-sm font-semibold"
          style={{
            fontFamily: "var(--font-plus-jakarta), sans-serif",
            color: "var(--acolhe-fg)",
          }}
        >
          Historico (ultimas 5)
        </h3>
        <div className="space-y-2">
          {jobs?.map((job) => {
            const cfg = STATUS_CONFIG[job.status as StatusJob];
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                }}
              >
                <FileText size={18} style={{ color: "var(--acolhe-primary)" }} />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--acolhe-fg)" }}
                  >
                    Exportacao {job.tipo}
                  </p>
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {new Date(job.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                {job.arquivoUrl && job.status === "CONCLUIDO" ? (
                  <a
                    href={job.arquivoUrl}
                    download
                    className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--acolhe-primary-light)",
                      color: "var(--acolhe-primary)",
                    }}
                  >
                    <Download size={12} />
                    Baixar
                  </a>
                ) : null}
              </div>
            );
          })}
          {(!jobs || jobs.length === 0) && (
            <p className="py-4 text-center text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
              Nenhuma exportacao gerada
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
