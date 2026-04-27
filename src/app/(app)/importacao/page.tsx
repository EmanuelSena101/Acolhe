"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

const STATUS_CONFIG = {
  PENDENTE: { label: "Pendente", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  PROCESSANDO: { label: "Processando", icon: Loader2, color: "text-blue-600", bg: "bg-blue-50" },
  CONCLUIDO: { label: "Concluido", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  CONCLUIDO_COM_ERROS: {
    label: "Com erros",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  ERRO: { label: "Erro", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
} as const;

type StatusJob = keyof typeof STATUS_CONFIG;

export default function ImportacaoPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<"FICHA_A" | "FICHA_B" | "VISITA" | "AUTO">(
    "AUTO",
  );

  const { data: jobs, refetch } = trpc.importacao.listarMeus.useQuery({ limit: 20 });

  const iniciarMutation = trpc.importacao.iniciar.useMutation({
    onSuccess: () => void refetch(),
  });

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Falha no upload");

        const { uploadId } = (await res.json()) as { uploadId: string };

        iniciarMutation.mutate({ uploadId, tipo: selectedTipo });
      } catch {
        alert("Erro ao fazer upload do arquivo.");
      } finally {
        setUploading(false);
      }
    },
    [selectedTipo, iniciarMutation],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleUpload(file);
    },
    [handleUpload],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Importacao</h1>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-3 text-sm text-gray-600">Arraste um arquivo .csv, .xml ou .zip aqui</p>
        <p className="mt-1 text-xs text-gray-400">ou</p>
        <label className="mt-3 inline-block cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Selecionar arquivo
          <input
            type="file"
            accept=".csv,.xml,.zip"
            onChange={handleFileInput}
            className="hidden"
            disabled={uploading}
          />
        </label>

        <div className="mt-4 flex items-center justify-center gap-3">
          <label className="text-xs text-gray-500">Tipo:</label>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value as typeof selectedTipo)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="AUTO">Auto-detectar</option>
            <option value="FICHA_A">Ficha A (Domicilios)</option>
            <option value="FICHA_B">Ficha B (Moradores)</option>
            <option value="VISITA">Ficha de Visita</option>
          </select>
        </div>

        {uploading && (
          <p className="mt-3 text-sm text-blue-600">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
            Enviando...
          </p>
        )}
      </div>

      {/* Jobs list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Historico de importacoes</h2>
        <div className="space-y-3">
          {jobs?.map((job) => {
            const cfg = STATUS_CONFIG[job.status as StatusJob];
            const Icon = cfg.icon;
            const progress =
              job.totalLinhas > 0
                ? Math.round(((job.totalSucesso + job.totalErro) / job.totalLinhas) * 100)
                : 0;

            return (
              <div
                key={job.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.arquivoNome}</p>
                      <p className="text-xs text-gray-400">{job.tipo}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                </div>

                {job.totalLinhas > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        {job.totalSucesso} sucesso / {job.totalErro} erros
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="mt-2 text-[10px] text-gray-400">
                  {new Date(job.criadoEm).toLocaleString("pt-BR")}
                </p>
              </div>
            );
          })}
          {(!jobs || jobs.length === 0) && (
            <p className="py-8 text-center text-sm text-gray-500">Nenhuma importacao realizada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
