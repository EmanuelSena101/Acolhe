import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseXML } from "@/server/services/esus/xml-parser";

const fixturesDir = resolve(__dirname, "../fixtures");

describe("parseXML", () => {
  it("parseia pacote minimo com domicilios, moradores e visitas", async () => {
    const content = readFileSync(resolve(fixturesDir, "pacote-minimo.xml"), "utf-8");
    const result = await parseXML(content);

    expect(result.erros).toHaveLength(0);
    expect(result.domicilios).toHaveLength(2);
    expect(result.moradores).toHaveLength(1);
    expect(result.visitas).toHaveLength(1);
  });

  it("extrai campos de domicilio corretamente", async () => {
    const content = readFileSync(resolve(fixturesDir, "pacote-minimo.xml"), "utf-8");
    const result = await parseXML(content);

    const dom = result.domicilios[0];
    expect(dom.cnes).toBe("1234567");
    expect(dom.ine).toBe("1234567890");
    expect(dom.microarea).toBe("001");
    expect(dom.logradouro).toBe("Rua das Flores");
    expect(dom.numero).toBe("100");
    expect(dom.bairro).toBe("Centro");
    expect(dom.external_id).toBe("uuid-dom-001");
  });

  it("extrai campos de morador corretamente", async () => {
    const content = readFileSync(resolve(fixturesDir, "pacote-minimo.xml"), "utf-8");
    const result = await parseXML(content);

    const mor = result.moradores[0];
    expect(mor.nome).toBe("Maria Silva");
    expect(mor.nascimento).toBe("1975-03-15");
    expect(mor.sexo).toBe("F");
    expect(mor.cns).toBe("123456789012345");
    expect(mor.condicoes).toBe("hipertensao|diabetes");
  });

  it("extrai campos de visita corretamente", async () => {
    const content = readFileSync(resolve(fixturesDir, "pacote-minimo.xml"), "utf-8");
    const result = await parseXML(content);

    const vis = result.visitas[0];
    expect(vis.data_visita).toBe("2025-04-25");
    expect(vis.status).toBe("REALIZADA");
    expect(vis.observacoes).toBe("Acompanhamento gestante");
  });

  it("converte camelCase para snake_case corretamente", async () => {
    const content = readFileSync(resolve(fixturesDir, "pacote-minimo.xml"), "utf-8");
    const result = await parseXML(content);

    const dom = result.domicilios[0];
    expect(dom.n_moradores).toBe("4");

    const vis = result.visitas[0];
    expect(vis.data_visita).toBe("2025-04-25");
  });

  it("retorna erro para XML invalido", async () => {
    const result = await parseXML("not valid xml <<>>");

    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].severity).toBe("ERROR");
    expect(result.erros[0].erro).toContain("Erro ao parsear XML");
  });

  it("retorna erro para campo obrigatorio ausente em domicilio", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<esus>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes>
    <ine>1234567890</ine>
    <microarea>001</microarea>
    <logradouro>Rua X</logradouro>
    <numero>10</numero>
  </fichaCadastroDomiciliar>
</esus>`;
    const result = await parseXML(xml);

    expect(result.domicilios).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].coluna).toBe("bairro");
    expect(result.erros[0].severity).toBe("ERROR");
  });

  it("retorna erro para campo obrigatorio ausente em morador", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<esus>
  <fichaCadastroIndividual>
    <cnes>1234567</cnes>
    <ine>1234567890</ine>
    <microarea>001</microarea>
    <logradouro>Rua X</logradouro>
    <numero>10</numero>
    <nome>Joao</nome>
  </fichaCadastroIndividual>
</esus>`;
    const result = await parseXML(xml);

    expect(result.moradores).toHaveLength(0);
    expect(result.erros.length).toBeGreaterThan(0);
    expect(result.erros.some((e) => e.coluna === "nascimento")).toBe(true);
  });

  it("processa multiplos elementos do mesmo tipo", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<esus>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes><ine>1234567890</ine><microarea>001</microarea>
    <logradouro>Rua A</logradouro><numero>1</numero><bairro>B1</bairro>
  </fichaCadastroDomiciliar>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes><ine>1234567890</ine><microarea>002</microarea>
    <logradouro>Rua B</logradouro><numero>2</numero><bairro>B2</bairro>
  </fichaCadastroDomiciliar>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes><ine>1234567890</ine><microarea>003</microarea>
    <logradouro>Rua C</logradouro><numero>3</numero><bairro>B3</bairro>
  </fichaCadastroDomiciliar>
</esus>`;
    const result = await parseXML(xml);

    expect(result.domicilios).toHaveLength(3);
    expect(result.domicilios[0].logradouro).toBe("Rua A");
    expect(result.domicilios[2].logradouro).toBe("Rua C");
  });

  it("aceita XML com tipos mistos", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<esus>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes><ine>1234567890</ine><microarea>001</microarea>
    <logradouro>Rua X</logradouro><numero>10</numero><bairro>Centro</bairro>
  </fichaCadastroDomiciliar>
  <fichaVisitaDomiciliar>
    <cnes>1234567</cnes><ine>1234567890</ine><microarea>001</microarea>
    <logradouro>Rua X</logradouro><numero>10</numero><dataVisita>2025-04-25</dataVisita>
  </fichaVisitaDomiciliar>
</esus>`;
    const result = await parseXML(xml);

    expect(result.domicilios).toHaveLength(1);
    expect(result.visitas).toHaveLength(1);
  });

  it("retorna vazio para XML sem fichas reconhecidas", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><esus><outroElemento>teste</outroElemento></esus>`;
    const result = await parseXML(xml);

    expect(result.domicilios).toHaveLength(0);
    expect(result.moradores).toHaveLength(0);
    expect(result.visitas).toHaveLength(0);
    expect(result.erros).toHaveLength(0);
  });

  it("retorna erro para raiz inexistente", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    const result = await parseXML(xml);

    expect(result.erros.length).toBeGreaterThan(0);
  });
});
