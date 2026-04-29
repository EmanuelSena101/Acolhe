"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart3, Download, FileText, AlertTriangle, MapPin } from "lucide-react";
import {
  StatusVisitasChart,
  CondicoesChart,
  CoberturaPorUbsChart,
  CoberturaPorEquipeChart,
  ProdutividadeAcsChart,
  VisitasPorDiaChart,
  DistribuicaoStatusChart,
} from "@/components/charts/relatorio-charts";

export default function RelatoriosPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;
  const prefeituraNome = prefeituras?.[0]?.nome;

  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  });
  const [ubsFilter, setUbsFilter] = useState<string>("all");
  const [equipeFilter, setEquipeFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const chartsRootRef = useRef<HTMLDivElement>(null);

  const { data: cobertura } = trpc.relatorios.coberturaMensal.useQuery(
    { prefeituraId: prefeituraId!, mes: periodo.mes, ano: periodo.ano },
    { enabled: !!prefeituraId },
  );

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: equipes } = trpc.equipe.listByPrefeitura.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: atrasadas } = trpc.relatorios.visitasAtrasadas.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: charts } = trpc.relatorios.charts.useQuery(
    {
      prefeituraId: prefeituraId!,
      mes: periodo.mes,
      ano: periodo.ano,
      ubsId: ubsFilter === "all" ? undefined : ubsFilter,
      equipeId: equipeFilter === "all" ? undefined : equipeFilter,
    },
    { enabled: !!prefeituraId },
  );

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  });

  const periodoLabel = `${new Date(periodo.ano, periodo.mes - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })}`;

  async function exportCSV() {
    if (!cobertura || !atrasadas) return;
    const lines = [
      "Relatorio de Cobertura Mensal",
      `Prefeitura: ${prefeituraNome ?? ""}`,
      `Periodo: ${periodoLabel}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
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
    setExporting(true);
    try {
      const [{ default: jsPDF }, autoTableMod, htmlToImage] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("html-to-image"),
      ]);
      const autoTable = autoTableMod.default;

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Header
      doc.setFillColor(27, 79, 107);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("Acolhe — Relatorio de Cobertura", margin, 15);
      doc.setFontSize(10);
      doc.text(prefeituraNome ?? "", margin, 22);

      doc.setTextColor(28, 26, 23);
      doc.setFontSize(10);
      doc.text(`Periodo: ${periodoLabel}`, margin, 36);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, 41);
      if (ubsFilter !== "all") {
        const ubs = ubsList?.find((u) => u.id === ubsFilter);
        if (ubs) doc.text(`UBS: ${ubs.nome}`, margin, 46);
      }
      if (equipeFilter !== "all") {
        const eq = equipes?.find((e) => e.id === equipeFilter);
        if (eq) doc.text(`Equipe: ${eq.nome}`, margin, 51);
      }

      // KPIs table
      autoTable(doc, {
        startY: 58,
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
        styles: { fontSize: 9 },
      });

      // Charts: capture each ChartCard with [data-capture-id]
      const root = chartsRootRef.current;
      if (root) {
        const chartNodes = Array.from(root.querySelectorAll<HTMLDivElement>("[data-capture-id]"));

        let y =
          ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
            80) + 10;

        for (const node of chartNodes) {
          const dataUrl = await htmlToImage.toPng(node, {
            backgroundColor: "#FFFFFF",
            pixelRatio: 2,
          });
          // Compute scaled dimensions
          const imgWidth = pageWidth - margin * 2;
          const ratio = node.offsetHeight / node.offsetWidth;
          const imgHeight = imgWidth * ratio;

          if (y + imgHeight + 8 > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.addImage(dataUrl, "PNG", margin, y, imgWidth, imgHeight);
          y += imgHeight + 6;
        }
      }

      // Visitas atrasadas table on a new page
      if (atrasadas.visitas.length > 0) {
        doc.addPage();
        doc.setFontSize(13);
        doc.text("Visitas Atrasadas", margin, margin + 4);
        autoTable(doc, {
          startY: margin + 8,
          head: [["Endereco", "Microarea", "ACS", "Data Prevista"]],
          body: atrasadas.visitas
            .slice(0, 50)
            .map((v) => [
              `${v.domicilio.logradouro} ${v.domicilio.numero}`,
              v.domicilio.microarea?.codigo ?? "—",
              v.acs.usuario.nome,
              new Date(v.dataPrevista).toLocaleDateString("pt-BR"),
            ]),
          theme: "grid",
          headStyles: { fillColor: [155, 28, 28] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`relatorio_${periodo.mes}_${periodo.ano}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
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
              {prefeituraNome ?? "Prefeitura"} · {periodoLabel}
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
            disabled={!cobertura || exporting}
            className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--acolhe-primary)",
              color: "#FFFFFF",
              boxShadow: "var(--acolhe-shadow-sm)",
            }}
          >
            <FileText size={15} />
            {exporting ? "Gerando..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={`${periodo.ano}-${periodo.mes}`}
          onChange={(v) => {
            const [a, m] = v.split("-").map(Number);
            setPeriodo({ ano: a, mes: m });
          }}
        >
          {meses.map((m) => (
            <option key={`${m.ano}-${m.mes}`} value={`${m.ano}-${m.mes}`}>
              {new Date(m.ano, m.mes - 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={ubsFilter}
          onChange={(v) => {
            setUbsFilter(v);
            setEquipeFilter("all");
          }}
        >
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

      {/* Charts (capture root) */}
      {charts && (
        <div ref={chartsRootRef} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <DistribuicaoStatusChart data={charts.distribuicaoStatus} />
            <StatusVisitasChart data={charts.statusVisitas} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CoberturaPorUbsChart data={charts.coberturaPorUbs} />
            <CoberturaPorEquipeChart data={charts.coberturaPorEquipe} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CondicoesChart data={charts.condicoes} />
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
                <tr key={v.id} style={{ borderBottom: "1px solid var(--acolhe-border)" }}>
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
        style={{ fontFamily: "var(--font-plus-jakarta), sans-serif", color: valueColor }}
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
