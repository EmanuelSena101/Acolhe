"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart3, Download, FileText, AlertTriangle, MapPin } from "lucide-react";
import {
  StatusVisitasChart,
  CondicoesChart,
  CoberturaPorUbsChart,
  ProdutividadeAcsChart,
  VisitasPorDiaChart,
} from "@/components/charts/relatorio-charts";

export default function RelatoriosPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;
  const prefeituraNome = prefeituras?.[0]?.nome;

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

  const { data: charts } = trpc.relatorios.charts.useQuery(
    { prefeituraId: prefeituraId!, mes: periodo.mes, ano: periodo.ano },
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
    doc.text("Acolhe - Relatorio de Cobertura", 14, 22);

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
      headStyles: { fillColor: [27, 79, 107] },
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
        headStyles: { fillColor: [27, 79, 107] },
      });
    }

    doc.save(`relatorio_cobertura_${periodo.mes}_${periodo.ano}.pdf`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--acolhe-primary-light)" }}
          >
            <BarChart3 size={20} style={{ color: "var(--acolhe-primary)" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Relatorios
            </h1>
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              {prefeituraNome ?? "Prefeitura"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={!cobertura}
            className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--acolhe-success)",
              color: "#FFFFFF",
              boxShadow: "var(--acolhe-shadow-sm)",
            }}
          >
            <Download size={15} />
            CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={!cobertura}
            className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--acolhe-primary)",
              color: "#FFFFFF",
              boxShadow: "var(--acolhe-shadow-sm)",
            }}
          >
            <FileText size={15} />
            PDF
          </button>
        </div>
      </div>

      {/* Período selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
          Periodo:
        </label>
        <select
          value={`${periodo.mes}-${periodo.ano}`}
          onChange={(e) => {
            const [m, a] = e.target.value.split("-").map(Number);
            setPeriodo({ mes: m, ano: a });
          }}
          className="h-9 rounded-lg px-3 text-sm outline-none"
          style={{
            backgroundColor: "var(--acolhe-card)",
            border: "1px solid var(--acolhe-border)",
            color: "var(--acolhe-fg)",
          }}
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

      {/* KPI cards */}
      {cobertura && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <KpiBox label="Total Domicilios" value={cobertura.totalDomicilios} />
          <KpiBox
            label="Visitados no Mes"
            value={cobertura.visitadosNoMes}
            valueColor="var(--acolhe-success)"
          />
          <KpiBox
            label="Cobertura"
            value={`${cobertura.cobertura}%`}
            valueColor="var(--acolhe-primary)"
            progress={cobertura.cobertura}
          />
          <KpiBox
            label="ACS Ativos"
            value={`${cobertura.acsAtivos}/${cobertura.totalAcs}`}
            valueColor="var(--acolhe-primary)"
          />
          <KpiBox
            label="Visitas Atrasadas"
            value={atrasadas?.total ?? "—"}
            valueColor={
              atrasadas && atrasadas.total > 0 ? "var(--acolhe-danger)" : "var(--acolhe-fg)"
            }
          />
        </div>
      )}

      {/* Charts */}
      {charts && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusVisitasChart data={charts.statusVisitas} />
            <CondicoesChart data={charts.condicoes} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CoberturaPorUbsChart data={charts.coberturaPorUbs} />
            <ProdutividadeAcsChart data={charts.produtividadeAcs} />
          </div>
          <VisitasPorDiaChart data={charts.visitasPorDia} />
        </div>
      )}

      {/* UBS table */}
      {ubsList && ubsList.length > 0 && (
        <SectionCard
          title="UBS da Prefeitura"
          icon={<MapPin size={18} style={{ color: "var(--acolhe-primary)" }} />}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--acolhe-border)" }}>
                <ColHead>Nome</ColHead>
                <ColHead>CNES</ColHead>
                <ColHead>Endereco</ColHead>
              </tr>
            </thead>
            <tbody>
              {ubsList.map((ubs) => (
                <tr
                  key={ubs.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--acolhe-border)" }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--acolhe-fg)" }}>
                    {ubs.nome}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {ubs.cnes}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {ubs.endereco ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* Visitas atrasadas table */}
      {atrasadas && atrasadas.visitas.length > 0 && (
        <SectionCard
          title={`Visitas Atrasadas (${atrasadas.total})`}
          icon={<AlertTriangle size={18} style={{ color: "var(--acolhe-danger)" }} />}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--acolhe-border)" }}>
                <ColHead>Endereco</ColHead>
                <ColHead>Microarea</ColHead>
                <ColHead>ACS</ColHead>
                <ColHead>Data Prevista</ColHead>
              </tr>
            </thead>
            <tbody>
              {atrasadas.visitas.map((v) => (
                <tr
                  key={v.id}
                  style={{ borderBottom: "1px solid var(--acolhe-border)" }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--acolhe-fg)" }}>
                    {v.domicilio.logradouro} {v.domicilio.numero}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {v.domicilio.microarea?.codigo ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {v.acs.usuario.nome}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--acolhe-danger)" }}>
                    {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}

function KpiBox({
  label,
  value,
  valueColor = "var(--acolhe-fg)",
  progress,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
  progress?: number;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--acolhe-muted-fg)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: valueColor,
        }}
      >
        {value}
      </p>
      {typeof progress === "number" && (
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--acolhe-muted)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: "var(--acolhe-success)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: "1px solid var(--acolhe-border)" }}
      >
        {icon}
        <h2
          className="text-base font-semibold"
          style={{
            fontFamily: "var(--font-plus-jakarta), sans-serif",
            color: "var(--acolhe-fg)",
          }}
        >
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function ColHead({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
      style={{ color: "var(--acolhe-muted-fg)" }}
    >
      {children}
    </th>
  );
}
