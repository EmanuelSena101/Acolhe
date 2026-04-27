import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { db } from "@/server/db";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./public/uploads";

interface ExportFilters {
  ubsId?: string;
  equipeId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

function escapeCSV(val: string | null | undefined): string {
  if (!val) return "";
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function queryDomicilios(prefeituraId: string, filters: ExportFilters) {
  const microareaWhere: Record<string, unknown> = {};
  const equipeWhere: Record<string, unknown> = {};
  const ubsWhere: Record<string, unknown> = { prefeituraId };

  if (filters.equipeId) equipeWhere.id = filters.equipeId;
  if (filters.ubsId) ubsWhere.id = filters.ubsId;

  return db.domicilio.findMany({
    where: {
      microarea: {
        ...microareaWhere,
        equipe: {
          ...equipeWhere,
          ubs: ubsWhere,
        },
      },
    },
    include: {
      microarea: {
        include: {
          equipe: {
            include: { ubs: true },
          },
        },
      },
    },
  });
}

async function queryMoradores(prefeituraId: string, filters: ExportFilters) {
  const equipeWhere: Record<string, unknown> = {};
  const ubsWhere: Record<string, unknown> = { prefeituraId };

  if (filters.equipeId) equipeWhere.id = filters.equipeId;
  if (filters.ubsId) ubsWhere.id = filters.ubsId;

  return db.morador.findMany({
    where: {
      domicilio: {
        microarea: {
          equipe: {
            ...equipeWhere,
            ubs: ubsWhere,
          },
        },
      },
    },
    include: {
      domicilio: {
        include: {
          microarea: {
            include: {
              equipe: {
                include: { ubs: true },
              },
            },
          },
        },
      },
    },
  });
}

async function queryVisitas(prefeituraId: string, filters: ExportFilters) {
  const equipeWhere: Record<string, unknown> = {};
  const ubsWhere: Record<string, unknown> = { prefeituraId };
  const visitaWhere: Record<string, unknown> = {};

  if (filters.equipeId) equipeWhere.id = filters.equipeId;
  if (filters.ubsId) ubsWhere.id = filters.ubsId;
  if (filters.dataInicio || filters.dataFim) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dataInicio) dateFilter.gte = filters.dataInicio;
    if (filters.dataFim) dateFilter.lte = filters.dataFim;
    visitaWhere.dataPrevista = dateFilter;
  }

  return db.visita.findMany({
    where: {
      ...visitaWhere,
      domicilio: {
        microarea: {
          equipe: {
            ...equipeWhere,
            ubs: ubsWhere,
          },
        },
      },
    },
    include: {
      domicilio: {
        include: {
          microarea: {
            include: {
              equipe: {
                include: { ubs: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function gerarCSV(prefeituraId: string, filters: ExportFilters): Promise<string> {
  const exportId = randomUUID();
  const exportDir = join(UPLOADS_DIR, "exports", exportId);
  await mkdir(exportDir, { recursive: true });

  const domicilios = await queryDomicilios(prefeituraId, filters);
  const fichaAHeader =
    "cnes;ine;microarea;logradouro;numero;complemento;bairro;cep;tipo;n_moradores;condicoes_moradia;latitude;longitude;external_id";
  const fichaARows = domicilios.map((d) =>
    [
      escapeCSV(d.microarea.equipe.ubs.cnes),
      escapeCSV(d.microarea.equipe.ine),
      escapeCSV(d.microarea.codigo),
      escapeCSV(d.logradouro),
      escapeCSV(d.numero),
      escapeCSV(d.complemento),
      escapeCSV(d.bairro),
      escapeCSV(d.cep),
      escapeCSV(d.tipo),
      String(d.nMoradores),
      escapeCSV(
        typeof d.condicoesMoradia === "string"
          ? d.condicoesMoradia
          : JSON.stringify(d.condicoesMoradia),
      ),
      "",
      "",
      escapeCSV(d.externalId),
    ].join(";"),
  );
  await writeFile(
    join(exportDir, "ficha_a.csv"),
    fichaAHeader + "\n" + fichaARows.join("\n"),
    "utf-8",
  );

  const moradores = await queryMoradores(prefeituraId, filters);
  const fichaBHeader =
    "cnes;ine;microarea;logradouro;numero;cns;cpf;nome;nascimento;sexo;condicoes;vinculo;external_id";
  const fichaBRows = moradores.map((m) =>
    [
      escapeCSV(m.domicilio.microarea.equipe.ubs.cnes),
      escapeCSV(m.domicilio.microarea.equipe.ine),
      escapeCSV(m.domicilio.microarea.codigo),
      escapeCSV(m.domicilio.logradouro),
      escapeCSV(m.domicilio.numero),
      escapeCSV(m.cns),
      escapeCSV(m.cpf),
      escapeCSV(m.nome),
      m.nascimento.toISOString().slice(0, 10),
      m.sexo === "MASCULINO" ? "M" : "F",
      escapeCSV(
        typeof m.condicoes === "string" ? m.condicoes : (m.condicoes as string[]).join("|"),
      ),
      escapeCSV(m.vinculo),
      escapeCSV(m.externalId),
    ].join(";"),
  );
  await writeFile(
    join(exportDir, "ficha_b.csv"),
    fichaBHeader + "\n" + fichaBRows.join("\n"),
    "utf-8",
  );

  const visitas = await queryVisitas(prefeituraId, filters);
  const visitaHeader =
    "cnes;ine;microarea;logradouro;numero;data_visita;status;motivo_recusa;observacoes;duracao_min;latitude;longitude;external_id";
  const visitaRows = visitas.map((v) =>
    [
      escapeCSV(v.domicilio.microarea.equipe.ubs.cnes),
      escapeCSV(v.domicilio.microarea.equipe.ine),
      escapeCSV(v.domicilio.microarea.codigo),
      escapeCSV(v.domicilio.logradouro),
      escapeCSV(v.domicilio.numero),
      v.dataPrevista.toISOString().slice(0, 10),
      v.status,
      escapeCSV(v.motivoRecusa),
      escapeCSV(v.observacoes),
      v.duracaoMin != null ? String(v.duracaoMin) : "",
      v.latCheckin != null ? String(v.latCheckin) : "",
      v.lngCheckin != null ? String(v.lngCheckin) : "",
      escapeCSV(v.externalId),
    ].join(";"),
  );
  await writeFile(
    join(exportDir, "ficha_visita.csv"),
    visitaHeader + "\n" + visitaRows.join("\n"),
    "utf-8",
  );

  return `/uploads/exports/${exportId}`;
}

export async function gerarXML(prefeituraId: string, filters: ExportFilters): Promise<string> {
  const exportId = randomUUID();
  const exportDir = join(UPLOADS_DIR, "exports", exportId);
  await mkdir(exportDir, { recursive: true });

  const domicilios = await queryDomicilios(prefeituraId, filters);
  const moradores = await queryMoradores(prefeituraId, filters);
  const visitas = await queryVisitas(prefeituraId, filters);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<esus>\n';

  for (const d of domicilios) {
    xml += "  <fichaCadastroDomiciliar>\n";
    xml += `    <cnes>${esc(d.microarea.equipe.ubs.cnes)}</cnes>\n`;
    xml += `    <ine>${esc(d.microarea.equipe.ine)}</ine>\n`;
    xml += `    <microarea>${esc(d.microarea.codigo)}</microarea>\n`;
    xml += `    <logradouro>${esc(d.logradouro)}</logradouro>\n`;
    xml += `    <numero>${esc(d.numero)}</numero>\n`;
    if (d.complemento) xml += `    <complemento>${esc(d.complemento)}</complemento>\n`;
    xml += `    <bairro>${esc(d.bairro)}</bairro>\n`;
    if (d.cep) xml += `    <cep>${esc(d.cep)}</cep>\n`;
    xml += `    <tipo>${esc(d.tipo)}</tipo>\n`;
    xml += `    <nMoradores>${d.nMoradores}</nMoradores>\n`;
    if (d.externalId) xml += `    <externalId>${esc(d.externalId)}</externalId>\n`;
    xml += "  </fichaCadastroDomiciliar>\n";
  }

  for (const m of moradores) {
    xml += "  <fichaCadastroIndividual>\n";
    xml += `    <cnes>${esc(m.domicilio.microarea.equipe.ubs.cnes)}</cnes>\n`;
    xml += `    <ine>${esc(m.domicilio.microarea.equipe.ine)}</ine>\n`;
    xml += `    <microarea>${esc(m.domicilio.microarea.codigo)}</microarea>\n`;
    xml += `    <logradouro>${esc(m.domicilio.logradouro)}</logradouro>\n`;
    xml += `    <numero>${esc(m.domicilio.numero)}</numero>\n`;
    xml += `    <nome>${esc(m.nome)}</nome>\n`;
    xml += `    <nascimento>${m.nascimento.toISOString().slice(0, 10)}</nascimento>\n`;
    xml += `    <sexo>${m.sexo === "MASCULINO" ? "M" : "F"}</sexo>\n`;
    if (m.cns) xml += `    <cns>${esc(m.cns)}</cns>\n`;
    if (m.cpf) xml += `    <cpf>${esc(m.cpf)}</cpf>\n`;
    const condicoes =
      typeof m.condicoes === "string" ? m.condicoes : (m.condicoes as string[]).join("|");
    if (condicoes) xml += `    <condicoes>${esc(condicoes)}</condicoes>\n`;
    if (m.externalId) xml += `    <externalId>${esc(m.externalId)}</externalId>\n`;
    xml += "  </fichaCadastroIndividual>\n";
  }

  for (const v of visitas) {
    xml += "  <fichaVisitaDomiciliar>\n";
    xml += `    <cnes>${esc(v.domicilio.microarea.equipe.ubs.cnes)}</cnes>\n`;
    xml += `    <ine>${esc(v.domicilio.microarea.equipe.ine)}</ine>\n`;
    xml += `    <microarea>${esc(v.domicilio.microarea.codigo)}</microarea>\n`;
    xml += `    <logradouro>${esc(v.domicilio.logradouro)}</logradouro>\n`;
    xml += `    <numero>${esc(v.domicilio.numero)}</numero>\n`;
    xml += `    <dataVisita>${v.dataPrevista.toISOString().slice(0, 10)}</dataVisita>\n`;
    xml += `    <status>${v.status}</status>\n`;
    if (v.observacoes) xml += `    <observacoes>${esc(v.observacoes)}</observacoes>\n`;
    if (v.externalId) xml += `    <externalId>${esc(v.externalId)}</externalId>\n`;
    xml += "  </fichaVisitaDomiciliar>\n";
  }

  xml += "</esus>\n";

  await writeFile(join(exportDir, "esus_export.xml"), xml, "utf-8");

  return `/uploads/exports/${exportId}`;
}

function esc(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = await db.exportJob.findUniqueOrThrow({ where: { id: jobId } });

  await db.exportJob.update({
    where: { id: jobId },
    data: { status: "PROCESSANDO" },
  });

  try {
    const filters = (job.filtros ?? {}) as ExportFilters;

    let arquivoUrl: string;
    if (job.tipo === "XML") {
      arquivoUrl = await gerarXML(job.prefeituraId, filters);
    } else {
      arquivoUrl = await gerarCSV(job.prefeituraId, filters);
    }

    await db.exportJob.update({
      where: { id: jobId },
      data: {
        status: "CONCLUIDO",
        arquivoUrl,
        concluidoEm: new Date(),
      },
    });
  } catch (e) {
    await db.exportJob.update({
      where: { id: jobId },
      data: {
        status: "ERRO",
        concluidoEm: new Date(),
      },
    });
    console.error(`Export job ${jobId} failed:`, e);
  }
}
