import { readFile } from "fs/promises";
import { extname, join } from "path";
import { createHash } from "crypto";
import { db } from "@/server/db";
import { parseCSV, type CsvParseError, type CsvTipo } from "./csv-parser";
import { parseXML } from "./xml-parser";
import { validarCNS, validarCEP, validarCNES, validarINE, validarData } from "./validators";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./public/uploads";
const PROGRESS_BATCH = 50;

type TipoImport =
  | "ESUS_CSV_FICHA_A"
  | "ESUS_CSV_FICHA_B"
  | "ESUS_CSV_VISITA"
  | "ESUS_XML"
  | "ESUS_ZIP";

function generateExternalId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

async function resolveInfra(
  record: Record<string, string>,
  prefeituraId: string,
): Promise<{
  microareaId: string | null;
  erros: CsvParseError[];
}> {
  const erros: CsvParseError[] = [];

  const cnesResult = validarCNES(record.cnes ?? "");
  if (!cnesResult.valido) {
    erros.push({
      linha: 0,
      coluna: "cnes",
      valor: record.cnes ?? "",
      erro: cnesResult.erro!,
      severity: "ERROR",
    });
    return { microareaId: null, erros };
  }

  const ubs = await db.uBS.findFirst({
    where: { cnes: record.cnes, prefeituraId },
    select: { id: true },
  });
  if (!ubs) {
    erros.push({
      linha: 0,
      coluna: "cnes",
      valor: record.cnes,
      erro: `UBS com CNES ${record.cnes} nao encontrada na prefeitura`,
      severity: "ERROR",
    });
    return { microareaId: null, erros };
  }

  const ineResult = validarINE(record.ine ?? "");
  if (!ineResult.valido) {
    erros.push({
      linha: 0,
      coluna: "ine",
      valor: record.ine ?? "",
      erro: ineResult.erro!,
      severity: "ERROR",
    });
    return { microareaId: null, erros };
  }

  const equipe = await db.equipeESF.findFirst({
    where: { ine: record.ine, ubsId: ubs.id },
    select: { id: true },
  });
  if (!equipe) {
    erros.push({
      linha: 0,
      coluna: "ine",
      valor: record.ine,
      erro: `Equipe com INE ${record.ine} nao encontrada`,
      severity: "ERROR",
    });
    return { microareaId: null, erros };
  }

  const microarea = await db.microarea.findFirst({
    where: { equipeId: equipe.id, codigo: record.microarea },
    select: { id: true },
  });
  if (!microarea) {
    erros.push({
      linha: 0,
      coluna: "microarea",
      valor: record.microarea,
      erro: `Microarea ${record.microarea} nao encontrada na equipe`,
      severity: "ERROR",
    });
    return { microareaId: null, erros };
  }

  if (record.cep) {
    const cepResult = validarCEP(record.cep);
    if (!cepResult.valido) {
      erros.push({
        linha: 0,
        coluna: "cep",
        valor: record.cep,
        erro: cepResult.erro!,
        severity: "WARNING",
      });
    }
  }

  return { microareaId: microarea.id, erros };
}

async function importDomicilio(
  record: Record<string, string>,
  prefeituraId: string,
  linha: number,
): Promise<{ sucesso: boolean; erros: CsvParseError[] }> {
  const { microareaId, erros } = await resolveInfra(record, prefeituraId);
  const lineErros = erros.map((e) => ({ ...e, linha }));

  if (!microareaId) return { sucesso: false, erros: lineErros };

  const externalId =
    record.external_id ||
    generateExternalId([
      record.cnes,
      record.ine,
      record.microarea,
      record.logradouro,
      record.numero,
    ]);

  const tipo = (record.tipo ?? "CASA").toUpperCase();
  const validTipos = ["CASA", "APARTAMENTO", "COMODO", "OUTRO"];
  const tipoFinal = validTipos.includes(tipo) ? tipo : "CASA";

  try {
    await db.domicilio.upsert({
      where: { microareaId_externalId: { microareaId, externalId } },
      create: {
        microareaId,
        externalId,
        logradouro: record.logradouro,
        numero: record.numero,
        complemento: record.complemento || null,
        bairro: record.bairro,
        cep: record.cep || null,
        tipo: tipoFinal as "CASA" | "APARTAMENTO" | "COMODO" | "OUTRO",
        nMoradores: parseInt(record.n_moradores || "0", 10) || 0,
        condicoesMoradia: record.condicoes_moradia
          ? JSON.stringify(record.condicoes_moradia.split("|"))
          : "{}",
      },
      update: {
        logradouro: record.logradouro,
        numero: record.numero,
        complemento: record.complemento || undefined,
        bairro: record.bairro,
        cep: record.cep || undefined,
        tipo: tipoFinal as "CASA" | "APARTAMENTO" | "COMODO" | "OUTRO",
        nMoradores: parseInt(record.n_moradores || "0", 10) || 0,
      },
    });
    return { sucesso: true, erros: lineErros.filter((e) => e.severity === "WARNING") };
  } catch (e) {
    lineErros.push({
      linha,
      coluna: "",
      valor: "",
      erro: `Erro ao salvar domicilio: ${e instanceof Error ? e.message : String(e)}`,
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }
}

async function importMorador(
  record: Record<string, string>,
  prefeituraId: string,
  linha: number,
): Promise<{ sucesso: boolean; erros: CsvParseError[] }> {
  const { microareaId, erros } = await resolveInfra(record, prefeituraId);
  const lineErros = erros.map((e) => ({ ...e, linha }));

  if (!microareaId) return { sucesso: false, erros: lineErros };

  const domicilio = await db.domicilio.findFirst({
    where: {
      microareaId,
      logradouro: record.logradouro,
      numero: record.numero,
    },
    select: { id: true },
  });

  if (!domicilio) {
    lineErros.push({
      linha,
      coluna: "logradouro",
      valor: `${record.logradouro} ${record.numero}`,
      erro: "Domicilio nao encontrado para vincular morador",
      severity: "WARNING",
    });
    return { sucesso: false, erros: lineErros };
  }

  if (record.cns) {
    const cnsResult = validarCNS(record.cns);
    if (!cnsResult.valido) {
      lineErros.push({
        linha,
        coluna: "cns",
        valor: record.cns,
        erro: cnsResult.erro!,
        severity: "ERROR",
      });
      return { sucesso: false, erros: lineErros };
    }
  }

  const nascResult = validarData(record.nascimento);
  if (!nascResult.valido) {
    lineErros.push({
      linha,
      coluna: "nascimento",
      valor: record.nascimento,
      erro: nascResult.erro!,
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }

  const sexoMap: Record<string, string> = {
    M: "MASCULINO",
    F: "FEMININO",
    MASCULINO: "MASCULINO",
    FEMININO: "FEMININO",
  };
  const sexo = sexoMap[(record.sexo ?? "").toUpperCase()] ?? "MASCULINO";

  const condicoes = record.condicoes ? record.condicoes.split("|").map((c) => c.trim()) : [];

  const externalId =
    record.external_id ||
    (record.cns ? record.cns : generateExternalId([record.nome, record.nascimento, domicilio.id]));

  try {
    await db.morador.upsert({
      where: { domicilioId_externalId: { domicilioId: domicilio.id, externalId } },
      create: {
        domicilioId: domicilio.id,
        externalId,
        cns: record.cns || null,
        cpf: record.cpf || null,
        nome: record.nome,
        nascimento: nascResult.data!,
        sexo: sexo as "MASCULINO" | "FEMININO",
        condicoes: JSON.stringify(condicoes),
        vinculo: record.vinculo || null,
      },
      update: {
        cns: record.cns || undefined,
        cpf: record.cpf || undefined,
        nome: record.nome,
        nascimento: nascResult.data!,
        sexo: sexo as "MASCULINO" | "FEMININO",
        condicoes: JSON.stringify(condicoes),
        vinculo: record.vinculo || undefined,
      },
    });
    return { sucesso: true, erros: lineErros.filter((e) => e.severity === "WARNING") };
  } catch (e) {
    lineErros.push({
      linha,
      coluna: "",
      valor: "",
      erro: `Erro ao salvar morador: ${e instanceof Error ? e.message : String(e)}`,
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }
}

async function importVisita(
  record: Record<string, string>,
  prefeituraId: string,
  linha: number,
): Promise<{ sucesso: boolean; erros: CsvParseError[] }> {
  const { microareaId, erros } = await resolveInfra(record, prefeituraId);
  const lineErros = erros.map((e) => ({ ...e, linha }));

  if (!microareaId) return { sucesso: false, erros: lineErros };

  const domicilio = await db.domicilio.findFirst({
    where: {
      microareaId,
      logradouro: record.logradouro,
      numero: record.numero,
    },
    select: { id: true },
  });

  if (!domicilio) {
    lineErros.push({
      linha,
      coluna: "logradouro",
      valor: `${record.logradouro} ${record.numero}`,
      erro: "Domicilio nao encontrado para registrar visita",
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }

  const dataResult = validarData(record.data_visita);
  if (!dataResult.valido) {
    lineErros.push({
      linha,
      coluna: "data_visita",
      valor: record.data_visita,
      erro: dataResult.erro!,
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }

  const microarea = await db.microarea.findUnique({
    where: { id: microareaId },
    select: { acsId: true },
  });

  const acsId = microarea?.acsId;
  if (!acsId) {
    lineErros.push({
      linha,
      coluna: "microarea",
      valor: record.microarea,
      erro: "Nenhum ACS atribuido a microarea",
      severity: "WARNING",
    });
    return { sucesso: false, erros: lineErros };
  }

  const statusMap: Record<string, string> = {
    REALIZADA: "REALIZADA",
    RECUSADA: "RECUSADA",
    AUSENTE: "AUSENTE",
  };
  const status = statusMap[(record.status ?? "REALIZADA").toUpperCase()] ?? "REALIZADA";

  const externalId =
    record.external_id || generateExternalId([domicilio.id, acsId, record.data_visita]);

  try {
    await db.visita.upsert({
      where: { domicilioId_externalId: { domicilioId: domicilio.id, externalId } },
      create: {
        acsId,
        domicilioId: domicilio.id,
        externalId,
        dataPrevista: dataResult.data!,
        dataRealizada: status === "REALIZADA" ? dataResult.data! : null,
        status: status as "PENDENTE" | "REALIZADA" | "RECUSADA" | "AUSENTE",
        motivoRecusa: record.motivo_recusa || null,
        observacoes: record.observacoes || null,
        duracaoMin: record.duracao_min ? parseInt(record.duracao_min, 10) || null : null,
      },
      update: {
        dataRealizada: status === "REALIZADA" ? dataResult.data! : undefined,
        status: status as "PENDENTE" | "REALIZADA" | "RECUSADA" | "AUSENTE",
        motivoRecusa: record.motivo_recusa || undefined,
        observacoes: record.observacoes || undefined,
        duracaoMin: record.duracao_min ? parseInt(record.duracao_min, 10) || undefined : undefined,
      },
    });
    return { sucesso: true, erros: lineErros.filter((e) => e.severity === "WARNING") };
  } catch (e) {
    lineErros.push({
      linha,
      coluna: "",
      valor: "",
      erro: `Erro ao salvar visita: ${e instanceof Error ? e.message : String(e)}`,
      severity: "ERROR",
    });
    return { sucesso: false, erros: lineErros };
  }
}

async function updateJobProgress(
  jobId: string,
  totalLinhas: number,
  totalSucesso: number,
  totalErro: number,
  log: CsvParseError[],
) {
  await db.importJob.update({
    where: { id: jobId },
    data: { totalLinhas, totalSucesso, totalErro, log: log as unknown as [] },
  });
}

async function processRecords(
  records: Record<string, string>[],
  tipo: CsvTipo,
  prefeituraId: string,
  jobId: string,
  startLine: number,
): Promise<{ sucesso: number; erro: number; log: CsvParseError[] }> {
  let sucesso = 0;
  let erro = 0;
  const log: CsvParseError[] = [];

  for (let i = 0; i < records.length; i++) {
    const linha = startLine + i;
    const record = records[i];

    let result: { sucesso: boolean; erros: CsvParseError[] };
    switch (tipo) {
      case "ESUS_CSV_FICHA_A":
        result = await importDomicilio(record, prefeituraId, linha);
        break;
      case "ESUS_CSV_FICHA_B":
        result = await importMorador(record, prefeituraId, linha);
        break;
      case "ESUS_CSV_VISITA":
        result = await importVisita(record, prefeituraId, linha);
        break;
    }

    if (result.sucesso) {
      sucesso++;
    } else {
      erro++;
    }
    log.push(...result.erros);

    if ((i + 1) % PROGRESS_BATCH === 0) {
      await updateJobProgress(jobId, records.length, sucesso, erro, log);
    }
  }

  return { sucesso, erro, log };
}

export async function processImportJob(jobId: string): Promise<void> {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });

  await db.importJob.update({
    where: { id: jobId },
    data: { status: "PROCESSANDO", iniciadoEm: new Date() },
  });

  try {
    const filePath = join(
      UPLOADS_DIR,
      job.arquivoNome.includes("/") ? job.arquivoNome : `${job.arquivoNome}`,
    );

    let fileContent: string;
    try {
      const rawBuffer = await readFile(
        job.arquivoUrl.startsWith("/uploads/") ? join(UPLOADS_DIR, "..", job.arquivoUrl) : filePath,
      );
      fileContent = rawBuffer.toString("utf-8");
    } catch {
      await db.importJob.update({
        where: { id: jobId },
        data: {
          status: "ERRO",
          concluidoEm: new Date(),
          log: [
            {
              linha: 0,
              coluna: "",
              valor: "",
              erro: "Arquivo nao encontrado no disco",
              severity: "ERROR",
            },
          ],
        },
      });
      return;
    }

    const ext = extname(job.arquivoNome).toLowerCase();
    const tipo = job.tipo as TipoImport;

    let totalSucesso = 0;
    let totalErro = 0;
    const allErros: CsvParseError[] = [];

    if (ext === ".xml" || tipo === "ESUS_XML") {
      const xmlResult = await parseXML(fileContent);

      if (
        xmlResult.erros.length > 0 &&
        xmlResult.domicilios.length === 0 &&
        xmlResult.moradores.length === 0 &&
        xmlResult.visitas.length === 0
      ) {
        await db.importJob.update({
          where: { id: jobId },
          data: {
            status: "ERRO",
            concluidoEm: new Date(),
            log: xmlResult.erros as unknown as [],
          },
        });
        return;
      }

      allErros.push(...xmlResult.erros);

      if (xmlResult.domicilios.length > 0) {
        const r = await processRecords(
          xmlResult.domicilios,
          "ESUS_CSV_FICHA_A",
          job.prefeituraId,
          jobId,
          1,
        );
        totalSucesso += r.sucesso;
        totalErro += r.erro;
        allErros.push(...r.log);
      }

      if (xmlResult.moradores.length > 0) {
        const r = await processRecords(
          xmlResult.moradores,
          "ESUS_CSV_FICHA_B",
          job.prefeituraId,
          jobId,
          1,
        );
        totalSucesso += r.sucesso;
        totalErro += r.erro;
        allErros.push(...r.log);
      }

      if (xmlResult.visitas.length > 0) {
        const r = await processRecords(
          xmlResult.visitas,
          "ESUS_CSV_VISITA",
          job.prefeituraId,
          jobId,
          1,
        );
        totalSucesso += r.sucesso;
        totalErro += r.erro;
        allErros.push(...r.log);
      }
    } else {
      const csvTipo =
        tipo === "ESUS_CSV_FICHA_A" || tipo === "ESUS_CSV_FICHA_B" || tipo === "ESUS_CSV_VISITA"
          ? tipo
          : undefined;
      const csvResult = parseCSV(fileContent, csvTipo);

      if (csvResult.erros.length > 0 && csvResult.registros.length === 0) {
        await db.importJob.update({
          where: { id: jobId },
          data: {
            status: "ERRO",
            totalLinhas: csvResult.totalLinhas,
            totalErro: csvResult.erros.length,
            concluidoEm: new Date(),
            log: csvResult.erros as unknown as [],
          },
        });
        return;
      }

      allErros.push(...csvResult.erros);
      totalErro += csvResult.erros.filter((e) => e.severity === "ERROR").length;

      const r = await processRecords(
        csvResult.registros,
        csvResult.tipo,
        job.prefeituraId,
        jobId,
        2,
      );
      totalSucesso += r.sucesso;
      totalErro += r.erro;
      allErros.push(...r.log);

      await db.importJob.update({
        where: { id: jobId },
        data: { totalLinhas: csvResult.totalLinhas },
      });
    }

    const finalStatus =
      totalErro === 0 ? "CONCLUIDO" : totalSucesso === 0 ? "ERRO" : "CONCLUIDO_COM_ERROS";

    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        totalSucesso,
        totalErro,
        concluidoEm: new Date(),
        log: allErros as unknown as [],
      },
    });
  } catch (e) {
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "ERRO",
        concluidoEm: new Date(),
        log: [
          {
            linha: 0,
            coluna: "",
            valor: "",
            erro: `Erro inesperado: ${e instanceof Error ? e.message : String(e)}`,
            severity: "ERROR",
          },
        ],
      },
    });
  }
}
