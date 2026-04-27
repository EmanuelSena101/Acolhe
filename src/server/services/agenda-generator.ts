import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

const REGRAS_FREQUENCIA: Record<string, number> = {
  gestante: 30,
  hipertensao: 90,
  hipertenso: 90,
  diabetes: 90,
  diabetico: 90,
  idoso_acamado: 30,
  acamado: 30,
  deficiente: 90,
  cancer: 60,
  doenca_respiratoria: 90,
  hanseniase: 30,
  tuberculose: 30,
};

const MAX_VISITAS_DIA = 12;

function getDiasDesdeUltimaVisita(ultimaVisita: Date | null): number {
  if (!ultimaVisita) return 999;
  return Math.floor((Date.now() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24));
}

const DEFAULT_FREQUENCIA = 180;

function getFrequenciaMinima(condicoes: string[]): number {
  if (condicoes.length === 0) return DEFAULT_FREQUENCIA;

  let min = DEFAULT_FREQUENCIA;
  for (const c of condicoes) {
    const freq = REGRAS_FREQUENCIA[c.toLowerCase()] ?? DEFAULT_FREQUENCIA;
    if (freq < min) min = freq;
  }
  return min;
}

interface DomicilioParaAgenda {
  id: string;
  logradouro: string;
  numero: string;
  ultimaVisita: Date | null;
  prioridade: number;
  condicoesMoradores: string[];
}

export async function gerarAgenda(acsId: string, data: Date) {
  const microareas = await db.microarea.findMany({
    where: { acsId },
    select: { id: true },
  });

  if (microareas.length === 0) {
    return { visitasOrdem: [], total: 0 };
  }

  const microareaIds = microareas.map((m) => m.id);

  const domicilios = await db.domicilio.findMany({
    where: { microareaId: { in: microareaIds } },
    select: {
      id: true,
      logradouro: true,
      numero: true,
      ultimaVisita: true,
      moradores: {
        where: { ativo: true },
        select: {
          prioridade: true,
          condicoes: true,
        },
      },
    },
  });

  const candidatos: DomicilioParaAgenda[] = domicilios.map((d) => {
    const condicoesMoradores: string[] = [];
    let maxPrioridade = 0;
    for (const m of d.moradores) {
      maxPrioridade = Math.max(maxPrioridade, m.prioridade);
      const conds = Array.isArray(m.condicoes) ? (m.condicoes as string[]) : [];
      condicoesMoradores.push(...conds);
    }

    return {
      id: d.id,
      logradouro: d.logradouro,
      numero: d.numero,
      ultimaVisita: d.ultimaVisita,
      prioridade: maxPrioridade,
      condicoesMoradores,
    };
  });

  const necessitamVisita = candidatos.filter((d) => {
    const dias = getDiasDesdeUltimaVisita(d.ultimaVisita);
    const freq = getFrequenciaMinima(d.condicoesMoradores);
    return dias >= freq;
  });

  necessitamVisita.sort((a, b) => {
    if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
    const diasA = getDiasDesdeUltimaVisita(a.ultimaVisita);
    const diasB = getDiasDesdeUltimaVisita(b.ultimaVisita);
    return diasB - diasA;
  });

  const selecionados = necessitamVisita.slice(0, MAX_VISITAS_DIA);

  const visitasOrdem = selecionados.map((d, i) => ({
    ordem: i + 1,
    domicilioId: d.id,
    logradouro: d.logradouro,
    numero: d.numero,
    prioridade: d.prioridade,
    condicoes: d.condicoesMoradores,
  }));

  const dataDate = new Date(data);
  dataDate.setHours(0, 0, 0, 0);

  await db.agendaDia.upsert({
    where: {
      acsId_data: { acsId, data: dataDate },
    },
    update: {
      visitasOrdem: visitasOrdem as unknown as Prisma.InputJsonValue,
      geradaEm: new Date(),
    },
    create: {
      acsId,
      data: dataDate,
      visitasOrdem: visitasOrdem as unknown as Prisma.InputJsonValue,
    },
  });

  return { visitasOrdem, total: visitasOrdem.length };
}
