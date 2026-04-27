import { db } from "@/server/db";

export function validarCNS(cns: string): { valido: boolean; erro?: string } {
  if (!cns) return { valido: true };

  const cleaned = cns.replace(/\D/g, "");
  if (cleaned.length !== 15) {
    return { valido: false, erro: "CNS deve ter 15 digitos" };
  }

  const firstChar = cleaned[0];
  if (firstChar === "1" || firstChar === "2") {
    let soma = 0;
    for (let i = 0; i < 11; i++) {
      soma += parseInt(cleaned[i], 10) * (15 - i);
    }
    const resto = soma % 11;
    const dv = resto === 0 ? 0 : 11 - resto;

    if (dv === 10) {
      let soma2 = soma + 2;
      const resto2 = soma2 % 11;
      const dv2 = resto2 === 0 ? 0 : 11 - resto2;
      if (parseInt(cleaned.substring(11), 10) !== dv2 * 1000 + 1) {
        return { valido: false, erro: "CNS com digito verificador invalido" };
      }
    } else {
      if (parseInt(cleaned.substring(11), 10) !== dv * 1000) {
        return { valido: false, erro: "CNS com digito verificador invalido" };
      }
    }
  } else if (firstChar === "7" || firstChar === "8" || firstChar === "9") {
    let soma = 0;
    for (let i = 0; i < 15; i++) {
      soma += parseInt(cleaned[i], 10) * (15 - i);
    }
    if (soma % 11 !== 0) {
      return { valido: false, erro: "CNS provisorio com checksum invalido" };
    }
  } else {
    return { valido: false, erro: "CNS deve iniciar com 1, 2, 7, 8 ou 9" };
  }

  return { valido: true };
}

export function validarCEP(cep: string): { valido: boolean; erro?: string } {
  if (!cep) return { valido: true };
  const cleaned = cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cleaned)) {
    return { valido: false, erro: "CEP deve ter 8 digitos" };
  }
  return { valido: true };
}

export function validarCNES(cnes: string): { valido: boolean; erro?: string } {
  if (!cnes) return { valido: true };
  const cleaned = cnes.replace(/\D/g, "");
  if (!/^\d{7}$/.test(cleaned)) {
    return { valido: false, erro: "CNES deve ter 7 digitos" };
  }
  return { valido: true };
}

export function validarINE(ine: string): { valido: boolean; erro?: string } {
  if (!ine) return { valido: true };
  const cleaned = ine.replace(/\D/g, "");
  if (!/^\d{10}$/.test(cleaned)) {
    return { valido: false, erro: "INE deve ter 10 digitos" };
  }
  return { valido: true };
}

export function validarData(str: string): { valido: boolean; data?: Date; erro?: string } {
  if (!str) return { valido: true };

  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})/;

  let match = str.match(ddmmyyyy);
  if (match) {
    const d = new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
    if (isNaN(d.getTime())) return { valido: false, erro: "Data invalida" };
    return { valido: true, data: d };
  }

  match = str.match(yyyymmdd);
  if (match) {
    const d = new Date(str);
    if (isNaN(d.getTime())) return { valido: false, erro: "Data invalida" };
    return { valido: true, data: d };
  }

  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return { valido: true, data: iso };

  return { valido: false, erro: "Formato de data nao reconhecido (use DD/MM/YYYY ou YYYY-MM-DD)" };
}

export async function validarCNESExiste(
  cnes: string,
  prefeituraId: string,
): Promise<{ valido: boolean; ubsId?: string; erro?: string }> {
  const formatResult = validarCNES(cnes);
  if (!formatResult.valido) return formatResult;

  const ubs = await db.uBS.findFirst({
    where: { cnes, prefeituraId },
    select: { id: true },
  });

  if (!ubs) {
    return { valido: false, erro: `UBS com CNES ${cnes} nao encontrada na prefeitura` };
  }

  return { valido: true, ubsId: ubs.id };
}

export async function validarINEExiste(
  ine: string,
): Promise<{ valido: boolean; equipeId?: string; erro?: string }> {
  const formatResult = validarINE(ine);
  if (!formatResult.valido) return formatResult;

  const equipe = await db.equipeESF.findFirst({
    where: { ine },
    select: { id: true },
  });

  if (!equipe) {
    return { valido: false, erro: `Equipe com INE ${ine} nao encontrada` };
  }

  return { valido: true, equipeId: equipe.id };
}
