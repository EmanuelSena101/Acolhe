"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2 } from "lucide-react";

export default function ExportacaoPage() {
  const [formato, setFormato] = useState<"CSV" | "XML">("CSV");
  const [jobId, setJobId] = useState<string | null>(null);

  const gerarCSV = trpc.exportacao.gerarCSV.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
  });
  const gerarXML = trpc.exportacao.gerarXML.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
  });

  const { data: jobStatus } = trpc.exportacao.status.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId, refetchInterval: 2000 },
  );

  const { data: exports } = trpc.exportacao.listar.useQuery({ limit: 20 });

  function handleExport() {
    if (formato === "CSV") {
      gerarCSV.mutate({});
    } else {
      gerarXML.mutate({});
    }
  }

  const isLoading = gerarCSV.isPending || gerarXML.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Download className="h-7 w-7 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Exportacao e-SUS</h1>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Gerar Exportacao</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Formato</label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as "CSV" | "XML")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="CSV">CSV (Ficha A/B/Visita)</option>
              <option value="XML">XML (e-SUS APS)</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Exportar
          </button>
        </div>

        {jobStatus && (
          <div className="mt-4 rounded-md border p-3">
            <p className="text-sm">
              <span className="font-medium">Status:</span>{" "}
              <span
                className={
                  jobStatus.status === "CONCLUIDO"
                    ? "text-green-600"
                    : jobStatus.status === "ERRO"
                      ? "text-red-600"
                      : "text-yellow-600"
                }
              >
                {jobStatus.status}
              </span>
            </p>
            {jobStatus.arquivoUrl && (
              <a
                href={jobStatus.arquivoUrl}
                download
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Download className="h-4 w-4" /> Baixar arquivo
              </a>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Historico de Exportacoes</h2>
        {exports && exports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-700">Tipo</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Data</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Arquivo</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((exp) => (
                  <tr key={exp.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{exp.tipo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          exp.status === "CONCLUIDO"
                            ? "bg-green-100 text-green-700"
                            : exp.status === "ERRO"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(exp.criadoEm).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {exp.arquivoUrl ? (
                        <a href={exp.arquivoUrl} download className="text-blue-600 hover:underline">
                          Baixar
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma exportacao realizada.</p>
        )}
      </div>
    </div>
  );
}
