"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart3, Download, FileText } from "lucide-react";

export default function RelatoriosPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;

  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  });

  const { data: cobertura } = trpc.relatorios.coberturaMensal.useQuery(
    { prefeituraId: prefeituraId!, mes: periodo.mes, ano: periodo.ano },
    { enabled: !!prefeituraId },
  );

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: atrasadas } = trpc.relatorios.visitasAtrasadas.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  });

  async function exportCSV() {
    if (!cobertura || !atrasadas) return;

    const lines = [
      "Relatorio de Cobertura Mensal",
      `Periodo: ${periodo.mes}/${periodo.ano}`,
      "",
      "Indicador;Valor",
      `Total Domicilios;${cobertura.totalDomicilios}`,
      `Visitados no Mes;${cobertura.visitadosNoMes}`,
      `Cobertura (%);${cobertura.cobertura}`,
      `Total ACS;${cobertura.totalAcs}`,
      `ACS Ativos;${cobertura.acsAtivos}`,
      `Visitas Atrasadas;${atrasadas.total}`,
      "",
      "Visitas Atrasadas - Detalhes",
      "Endereco;Microarea;ACS;Data Prevista",
    ];

    for (const v of atrasadas.visitas.slice(0, 50)) {
      lines.push(
        `${v.domicilio.logradouro} ${v.domicilio.numero};${v.domicilio.microarea?.codigo ?? ""};${v.acs.usuario.nome};${new Date(v.dataPrevista).toLocaleDateString("pt-BR")}`,
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_cobertura_${periodo.mes}_${periodo.ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    if (!cobertura || !atrasadas) return;

    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("SaudeTerritorio - Relatorio de Cobertura", 14, 22);

    doc.setFontSize(11);
    doc.text(`Periodo: ${periodo.mes}/${periodo.ano}`, 14, 32);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 38);

    doc.setFontSize(13);
    doc.text("Indicadores", 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total Domicilios", String(cobertura.totalDomicilios)],
        ["Visitados no Mes", String(cobertura.visitadosNoMes)],
        ["Cobertura (%)", `${cobertura.cobertura}%`],
        ["Total ACS", String(cobertura.totalAcs)],
        ["ACS Ativos", String(cobertura.acsAtivos)],
        ["Visitas Atrasadas", String(atrasadas.total)],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138] },
    });

    const finalY =
      ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable
        ?.finalY as number) ?? 120;

    if (atrasadas.visitas.length > 0) {
      doc.setFontSize(13);
      doc.text("Visitas Atrasadas", 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Endereco", "Microarea", "ACS", "Data Prevista"]],
        body: atrasadas.visitas
          .slice(0, 30)
          .map((v) => [
            `${v.domicilio.logradouro} ${v.domicilio.numero}`,
            v.domicilio.microarea?.codigo ?? "",
            v.acs.usuario.nome,
            new Date(v.dataPrevista).toLocaleDateString("pt-BR"),
          ]),
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138] },
      });
    }

    doc.save(`relatorio_cobertura_${periodo.mes}_${periodo.ano}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={!cobertura}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={!cobertura}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Periodo:</label>
        <select
          value={`${periodo.mes}-${periodo.ano}`}
          onChange={(e) => {
            const [m, a] = e.target.value.split("-").map(Number);
            setPeriodo({ mes: m, ano: a });
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {meses.map((m) => (
            <option key={`${m.mes}-${m.ano}`} value={`${m.mes}-${m.ano}`}>
              {new Date(m.ano, m.mes - 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </option>
          ))}
        </select>
      </div>

      {cobertura && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Domicilios</p>
            <p className="text-2xl font-bold text-gray-900">{cobertura.totalDomicilios}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Visitados no Mes</p>
            <p className="text-2xl font-bold text-blue-700">{cobertura.visitadosNoMes}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Cobertura</p>
            <p className="text-2xl font-bold text-green-700">{cobertura.cobertura}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${Math.min(cobertura.cobertura, 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">ACS Ativos</p>
            <p className="text-2xl font-bold text-purple-700">
              {cobertura.acsAtivos}/{cobertura.totalAcs}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Visitas Atrasadas</p>
            <p className="text-2xl font-bold text-red-700">{atrasadas?.total ?? "—"}</p>
          </div>
        </div>
      )}

      {ubsList && ubsList.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">UBS da Prefeitura</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 font-medium text-gray-700">CNES</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Endereco</th>
                </tr>
              </thead>
              <tbody>
                {ubsList.map((ubs) => (
                  <tr key={ubs.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{ubs.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{ubs.cnes}</td>
                    <td className="px-4 py-3 text-gray-600">{ubs.endereco ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {atrasadas && atrasadas.visitas.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Visitas Atrasadas ({atrasadas.total})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-700">Endereco</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Microarea</th>
                  <th className="px-4 py-3 font-medium text-gray-700">ACS</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Data Prevista</th>
                </tr>
              </thead>
              <tbody>
                {atrasadas.visitas.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {v.domicilio.logradouro} {v.domicilio.numero}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.domicilio.microarea?.codigo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.acs.usuario.nome}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
