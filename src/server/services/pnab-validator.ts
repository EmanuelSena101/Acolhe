import { db } from "@/server/db";

export interface PnabValidationResult {
  valida: boolean;
  erros: string[];
  populacaoEstimada: number;
}

const MAX_POPULACAO_MICROAREA = 750;

export async function validarPNAB(
  microareaId: string,
  _equipeId?: string,
): Promise<PnabValidationResult> {
  const erros: string[] = [];

  const microarea = await db.microarea.findUnique({
    where: { id: microareaId },
    include: {
      _count: { select: { domicilios: true } },
    },
  });

  if (!microarea) {
    return { valida: false, erros: ["MICROAREA_NAO_ENCONTRADA"], populacaoEstimada: 0 };
  }

  const populacaoEstimada = microarea._count.domicilios * 3;

  if (populacaoEstimada > MAX_POPULACAO_MICROAREA) {
    erros.push("POPULACAO_EXCEDIDA");
  }

  if (populacaoEstimada === 0) {
    erros.push("MICROAREA_VAZIA");
  }

  return {
    valida: erros.length === 0,
    erros,
    populacaoEstimada,
  };
}
