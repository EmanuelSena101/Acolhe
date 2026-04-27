import { describe, it, expect } from "vitest";
import {
  validarCNS,
  validarCEP,
  validarCNES,
  validarINE,
  validarData,
  validarCoordenada,
} from "@/server/services/esus/validators";

describe("validarCNS", () => {
  it("retorna valido para string vazia", () => {
    expect(validarCNS("")).toEqual({ valido: true });
  });

  it("rejeita CNS com menos de 15 digitos", () => {
    const r = validarCNS("1234567890");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("15 digitos");
  });

  it("rejeita CNS com mais de 15 digitos", () => {
    const r = validarCNS("1234567890123456");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("15 digitos");
  });

  it("rejeita CNS que inicia com digito invalido (3-6)", () => {
    const r = validarCNS("300000000000000");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("iniciar com 1, 2, 7, 8 ou 9");
  });

  it("rejeita CNS definitivo (inicio 1) com DV errado", () => {
    const r = validarCNS("123456789012345");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("digito verificador");
  });

  it("rejeita CNS provisorio (inicio 7) com checksum errado", () => {
    const r = validarCNS("700000000000001");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("checksum");
  });

  it("aceita CNS provisorio valido (soma % 11 === 0)", () => {
    // Construir um CNS provisório válido: início com 7, soma ponderada % 11 === 0
    // 700000000000000: soma = 7*15 + 0*14 + ... + 0*1 = 105; 105 % 11 = 6 ≠ 0
    // Tentar 798063460734895 (known valid CNS provisório)
    // Vamos calcular manualmente um CNS provisório:
    // Digits: 7 0 0 0 0 0 0 0 0 0 0 0 0 0 X
    // Soma sem X: 7*15 = 105
    // Precisamos 105 + X*1 ≡ 0 mod 11 → X = 11 - (105 % 11) = 11 - 6 = 5
    const r = validarCNS("700000000000005");
    expect(r.valido).toBe(true);
  });

  it("limpa caracteres nao numericos antes de validar", () => {
    const r = validarCNS("700.000.000.000.005");
    expect(r.valido).toBe(true);
  });
});

describe("validarCEP", () => {
  it("retorna valido para string vazia", () => {
    expect(validarCEP("")).toEqual({ valido: true });
  });

  it("aceita CEP com 8 digitos", () => {
    expect(validarCEP("13230000").valido).toBe(true);
  });

  it("aceita CEP com hifen", () => {
    expect(validarCEP("13230-000").valido).toBe(true);
  });

  it("rejeita CEP com menos de 8 digitos", () => {
    const r = validarCEP("1323000");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("8 digitos");
  });

  it("rejeita CEP com letras", () => {
    const r = validarCEP("1323000A");
    expect(r.valido).toBe(false);
  });

  it("rejeita CEP com mais de 8 digitos", () => {
    const r = validarCEP("132300001");
    expect(r.valido).toBe(false);
  });
});

describe("validarCNES", () => {
  it("retorna valido para string vazia", () => {
    expect(validarCNES("")).toEqual({ valido: true });
  });

  it("aceita CNES com 7 digitos", () => {
    expect(validarCNES("1234567").valido).toBe(true);
  });

  it("rejeita CNES com 6 digitos", () => {
    const r = validarCNES("123456");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("7 digitos");
  });

  it("rejeita CNES com 8 digitos", () => {
    const r = validarCNES("12345678");
    expect(r.valido).toBe(false);
  });

  it("limpa caracteres nao numericos", () => {
    expect(validarCNES("123-4567").valido).toBe(true);
  });
});

describe("validarINE", () => {
  it("retorna valido para string vazia", () => {
    expect(validarINE("")).toEqual({ valido: true });
  });

  it("aceita INE com 10 digitos", () => {
    expect(validarINE("1234567890").valido).toBe(true);
  });

  it("rejeita INE com 9 digitos", () => {
    const r = validarINE("123456789");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("10 digitos");
  });

  it("rejeita INE com 11 digitos", () => {
    const r = validarINE("12345678901");
    expect(r.valido).toBe(false);
  });
});

describe("validarData", () => {
  it("retorna valido para string vazia", () => {
    expect(validarData("")).toEqual({ valido: true });
  });

  // DD/MM/YYYY
  it("aceita data DD/MM/YYYY valida", () => {
    const r = validarData("25/04/2025");
    expect(r.valido).toBe(true);
    expect(r.data).toBeInstanceOf(Date);
    expect(r.data!.getDate()).toBe(25);
    expect(r.data!.getMonth()).toBe(3); // abril = 3
    expect(r.data!.getFullYear()).toBe(2025);
  });

  it("rejeita data DD/MM/YYYY invalida (31 de fevereiro)", () => {
    const r = validarData("31/02/2025");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("invalida");
  });

  it("rejeita data DD/MM/YYYY invalida (30 de fevereiro)", () => {
    const r = validarData("30/02/2025");
    expect(r.valido).toBe(false);
  });

  it("aceita 29/02 em ano bissexto", () => {
    const r = validarData("29/02/2024");
    expect(r.valido).toBe(true);
    expect(r.data!.getDate()).toBe(29);
  });

  it("rejeita 29/02 em ano nao bissexto", () => {
    const r = validarData("29/02/2025");
    expect(r.valido).toBe(false);
  });

  it("rejeita mes 13", () => {
    const r = validarData("01/13/2025");
    expect(r.valido).toBe(false);
  });

  it("rejeita dia 32", () => {
    const r = validarData("32/01/2025");
    expect(r.valido).toBe(false);
  });

  // YYYY-MM-DD
  it("aceita data YYYY-MM-DD valida", () => {
    const r = validarData("2025-04-25");
    expect(r.valido).toBe(true);
    expect(r.data).toBeInstanceOf(Date);
    expect(r.data!.getFullYear()).toBe(2025);
    expect(r.data!.getMonth()).toBe(3);
    expect(r.data!.getDate()).toBe(25);
  });

  it("rejeita YYYY-MM-DD invalida (31/02)", () => {
    const r = validarData("2025-02-31");
    expect(r.valido).toBe(false);
  });

  it("rejeita YYYY-MM-DD com mes 00", () => {
    const r = validarData("2025-00-15");
    expect(r.valido).toBe(false);
  });

  // ISO 8601
  it("aceita ISO 8601 completa", () => {
    const r = validarData("2025-04-25T14:30:00.000Z");
    expect(r.valido).toBe(true);
    expect(r.data).toBeInstanceOf(Date);
  });

  // Formato invalido
  it("rejeita formato completamente invalido", () => {
    const r = validarData("nao-e-data");
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("Formato de data");
  });

  it("rejeita string aleatoria", () => {
    const r = validarData("abc123");
    expect(r.valido).toBe(false);
  });
});

describe("validarCoordenada", () => {
  it("aceita coordenada valida dentro do Brasil", () => {
    // São Paulo: -23.55, -46.63
    expect(validarCoordenada(-23.55, -46.63).valido).toBe(true);
  });

  it("aceita coordenada no extremo norte do Brasil", () => {
    expect(validarCoordenada(5.27, -60.0).valido).toBe(true);
  });

  it("aceita coordenada no extremo sul do Brasil", () => {
    expect(validarCoordenada(-33.75, -53.0).valido).toBe(true);
  });

  it("aceita coordenada no extremo oeste do Brasil", () => {
    expect(validarCoordenada(-10.0, -73.99).valido).toBe(true);
  });

  it("aceita coordenada no extremo leste do Brasil", () => {
    expect(validarCoordenada(-7.0, -34.79).valido).toBe(true);
  });

  it("rejeita latitude acima do range", () => {
    const r = validarCoordenada(10.0, -46.63);
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("Latitude");
  });

  it("rejeita latitude abaixo do range", () => {
    const r = validarCoordenada(-40.0, -46.63);
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("Latitude");
  });

  it("rejeita longitude fora do range (muito a leste)", () => {
    const r = validarCoordenada(-23.55, -30.0);
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("Longitude");
  });

  it("rejeita longitude fora do range (muito a oeste)", () => {
    const r = validarCoordenada(-23.55, -80.0);
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("Longitude");
  });

  it("rejeita coordenadas completamente fora (Europa)", () => {
    const r = validarCoordenada(48.85, 2.35);
    expect(r.valido).toBe(false);
  });

  it("rejeita NaN como coordenada", () => {
    const r = validarCoordenada(NaN, NaN);
    expect(r.valido).toBe(false);
    expect(r.erro).toContain("nao numericos");
  });

  it("rejeita NaN em latitude apenas", () => {
    const r = validarCoordenada(NaN, -46.63);
    expect(r.valido).toBe(false);
  });

  it("rejeita NaN em longitude apenas", () => {
    const r = validarCoordenada(-23.55, NaN);
    expect(r.valido).toBe(false);
  });
});
