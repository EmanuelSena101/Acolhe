import { PrismaClient, Papel, StatusVisita, TipoDomicilio, Sexo } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const TEAM_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#34495E",
];

const NOMES_MASC = [
  "Carlos Silva",
  "Jose Santos",
  "Antonio Oliveira",
  "Francisco Souza",
  "Pedro Lima",
  "Lucas Pereira",
  "Marcos Costa",
  "Rafael Almeida",
  "Fernando Rodrigues",
  "Ricardo Gomes",
  "Bruno Nascimento",
  "Andre Araujo",
  "Gustavo Barbosa",
  "Jorge Cavalcanti",
  "Henrique Mendes",
  "Thiago Ribeiro",
];

const NOMES_FEM = [
  "Maria Aparecida",
  "Ana Paula",
  "Francisca Lima",
  "Julia Santos",
  "Patricia Oliveira",
  "Fernanda Costa",
  "Camila Souza",
  "Juliana Pereira",
  "Mariana Rodrigues",
  "Larissa Almeida",
  "Beatriz Nascimento",
  "Carolina Araujo",
  "Amanda Barbosa",
  "Vanessa Cavalcanti",
  "Renata Mendes",
  "Tatiane Ribeiro",
];

const LOGRADOUROS = [
  "Rua das Flores",
  "Rua Sao Paulo",
  "Rua Rio de Janeiro",
  "Rua Minas Gerais",
  "Avenida Brasil",
  "Rua Bahia",
  "Rua Parana",
  "Rua Santa Catarina",
  "Rua Goias",
  "Rua Pernambuco",
  "Rua Ceara",
  "Rua Maranhao",
  "Rua Piauí",
  "Rua Sergipe",
  "Rua Alagoas",
  "Rua Paraiba",
  "Travessa da Paz",
  "Rua da Liberdade",
  "Rua da Esperanca",
  "Rua Boa Vista",
];

const BAIRROS_CL = ["Centro", "Jd. America", "Jd. Paulista", "Vl. Operaria", "Parque Industrial"];
const BAIRROS_VP = ["Centro", "Jd. Maracanã", "Vl. Nova", "Jd. Silvestre", "Pq. Guarani"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  d.setHours(randomInt(7, 17), randomInt(0, 59), 0, 0);
  return d;
}

function generateCondicoes(): string[] {
  const condicoes: string[] = [];
  if (Math.random() < 0.15) condicoes.push("hipertensao");
  if (Math.random() < 0.08) condicoes.push("diabetes");
  if (Math.random() < 0.02) condicoes.push("gestante");
  if (Math.random() < 0.05) condicoes.push("idoso_acamado");
  if (Math.random() < 0.03) condicoes.push("doenca_respiratoria");
  return condicoes;
}

function generateBirthdate(): Date {
  const yearsAgo = randomInt(0, 90);
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  d.setMonth(randomInt(0, 11));
  d.setDate(randomInt(1, 28));
  return d;
}

interface PrefeituraConfig {
  ibgeCode: string;
  nome: string;
  uf: string;
  bairros: string[];
  coordEmail: string;
  acsPrefix: string;
}

interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface PrefeituraConfigGeo extends PrefeituraConfig {
  bbox: BBox;
}

const PREFEITURAS: PrefeituraConfigGeo[] = [
  {
    ibgeCode: "3509601",
    nome: "Campo Limpo Paulista",
    uf: "SP",
    bairros: BAIRROS_CL,
    coordEmail: "coord.cl@saudeterritorio.dev",
    acsPrefix: "cl",
    bbox: { minLng: -46.81, minLat: -23.24, maxLng: -46.76, maxLat: -23.18 },
  },
  {
    ibgeCode: "3556404",
    nome: "Varzea Paulista",
    uf: "SP",
    bairros: BAIRROS_VP,
    coordEmail: "coord.vp@saudeterritorio.dev",
    acsPrefix: "vp",
    bbox: { minLng: -46.85, minLat: -23.24, maxLng: -46.81, maxLat: -23.19 },
  },
];

function bboxPolygonWKT(b: BBox): string {
  return `POLYGON((${b.minLng} ${b.minLat}, ${b.maxLng} ${b.minLat}, ${b.maxLng} ${b.maxLat}, ${b.minLng} ${b.maxLat}, ${b.minLng} ${b.minLat}))`;
}

function bboxMultiPolygonWKT(b: BBox): string {
  return `MULTIPOLYGON(((${b.minLng} ${b.minLat}, ${b.maxLng} ${b.minLat}, ${b.maxLng} ${b.maxLat}, ${b.minLng} ${b.maxLat}, ${b.minLng} ${b.minLat})))`;
}

function pointWKT(lng: number, lat: number): string {
  return `POINT(${lng} ${lat})`;
}

function randomPointInBBox(b: BBox): { lng: number; lat: number } {
  return {
    lng: b.minLng + Math.random() * (b.maxLng - b.minLng),
    lat: b.minLat + Math.random() * (b.maxLat - b.minLat),
  };
}

function gridCell(parent: BBox, cols: number, rows: number, col: number, row: number): BBox {
  const w = (parent.maxLng - parent.minLng) / cols;
  const h = (parent.maxLat - parent.minLat) / rows;
  return {
    minLng: parent.minLng + col * w,
    minLat: parent.minLat + row * h,
    maxLng: parent.minLng + (col + 1) * w,
    maxLat: parent.minLat + (row + 1) * h,
  };
}

async function main() {
  console.log("Seeding database...");

  const senhaAdmin = await hash("admin123", 12);
  const senhaDemo = await hash("demo123", 12);

  // 1. SUPERADMIN
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@saudeterritorio.dev" },
    update: {},
    create: {
      email: "admin@saudeterritorio.dev",
      nome: "Administrador",
      papel: Papel.SUPERADMIN,
      senhaHash: senhaAdmin,
    },
  });
  console.log(`  SUPERADMIN: ${admin.email}`);

  for (const cfg of PREFEITURAS) {
    console.log(`\n  Populando ${cfg.nome}...`);

    // 2. Prefeitura
    const prefeitura = await prisma.prefeitura.upsert({
      where: { ibgeCode: cfg.ibgeCode },
      update: {},
      create: {
        ibgeCode: cfg.ibgeCode,
        nome: cfg.nome,
        uf: cfg.uf,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "Prefeitura" SET geom = ST_GeomFromText($1, 4326) WHERE id = $2`,
      bboxMultiPolygonWKT(cfg.bbox),
      prefeitura.id,
    );

    // 3. COORD_MUNICIPAL
    const coord = await prisma.usuario.upsert({
      where: { email: cfg.coordEmail },
      update: {},
      create: {
        email: cfg.coordEmail,
        nome: `Coordenador ${cfg.nome}`,
        papel: Papel.COORD_MUNICIPAL,
        senhaHash: senhaDemo,
        prefeituraId: prefeitura.id,
      },
    });
    console.log(`    COORD: ${coord.email}`);

    // 4. UBS (2 per prefeitura)
    const ubsList = [];
    for (let u = 1; u <= 2; u++) {
      const ubs = await prisma.uBS.upsert({
        where: { cnes: `${cfg.ibgeCode}${u}` },
        update: {},
        create: {
          prefeituraId: prefeitura.id,
          cnes: `${cfg.ibgeCode}${u}`,
          nome: `UBS ${cfg.nome} ${u}`,
          endereco: `${randomItem(LOGRADOUROS)}, ${randomInt(100, 999)} - ${randomItem(cfg.bairros)}`,
        },
      });
      const ubsCell = gridCell(cfg.bbox, 2, 1, u - 1, 0);
      const ubsCenter = {
        lng: (ubsCell.minLng + ubsCell.maxLng) / 2,
        lat: (ubsCell.minLat + ubsCell.maxLat) / 2,
      };
      await prisma.$executeRawUnsafe(
        `UPDATE "UBS" SET geom = ST_GeomFromText($1, 4326) WHERE id = $2`,
        pointWKT(ubsCenter.lng, ubsCenter.lat),
        ubs.id,
      );
      ubsList.push(ubs);

      // GERENTE_UBS
      const gerenteEmail = `gerente.ubs${u}.${cfg.acsPrefix}@saudeterritorio.dev`;
      await prisma.usuario.upsert({
        where: { email: gerenteEmail },
        update: {},
        create: {
          email: gerenteEmail,
          nome: `Gerente UBS ${u} ${cfg.nome}`,
          papel: Papel.GERENTE_UBS,
          senhaHash: senhaDemo,
          prefeituraId: prefeitura.id,
        },
      });
      console.log(`    GERENTE_UBS: ${gerenteEmail}`);
    }

    // 5. Equipes ESF (2 per UBS = 4 total)
    let colorIdx = cfg.acsPrefix === "cl" ? 0 : 4;
    const allEquipes = [];
    for (const ubs of ubsList) {
      for (let e = 1; e <= 2; e++) {
        const equipeNum = ubsList.indexOf(ubs) * 2 + e;
        const equipe = await prisma.equipeESF.upsert({
          where: { ine: `INE-${cfg.ibgeCode}-${equipeNum}` },
          update: {},
          create: {
            ubsId: ubs.id,
            ine: `INE-${cfg.ibgeCode}-${equipeNum}`,
            nome: `Equipe ${equipeNum} ${cfg.nome}`,
            cor: TEAM_COLORS[colorIdx % TEAM_COLORS.length],
          },
        });
        allEquipes.push(equipe);
        colorIdx++;
      }
    }

    // 6. ACS (1 per equipe = 4 per prefeitura)
    const allAcs = [];
    for (let i = 0; i < allEquipes.length; i++) {
      const equipe = allEquipes[i];
      const acsEmail = `acs${i + 1}.${cfg.acsPrefix}@demo`;
      const acsUser = await prisma.usuario.upsert({
        where: { email: acsEmail },
        update: {},
        create: {
          email: acsEmail,
          nome: randomItem(NOMES_FEM),
          papel: Papel.ACS,
          senhaHash: senhaDemo,
          prefeituraId: prefeitura.id,
        },
      });

      const acs = await prisma.aCS.upsert({
        where: { matricula: `MAT-${cfg.ibgeCode}-${i + 1}` },
        update: {},
        create: {
          usuarioId: acsUser.id,
          equipeId: equipe.id,
          matricula: `MAT-${cfg.ibgeCode}-${i + 1}`,
          cargaHoraria: 40,
        },
      });
      allAcs.push(acs);
      console.log(`    ACS: ${acsEmail}`);
    }

    // 7. Microareas (2 per equipe = 8 per prefeitura) — grid 4 cols x 2 rows
    const allMicroareas: { id: string; bbox: BBox }[] = [];
    let microIdx = 0;
    for (let i = 0; i < allEquipes.length; i++) {
      const equipe = allEquipes[i];
      const acs = allAcs[i];
      for (let m = 1; m <= 2; m++) {
        const codigo = `${(i * 2 + m).toString().padStart(3, "0")}`;
        const col = microIdx % 4;
        const row = Math.floor(microIdx / 4);
        const cell = gridCell(cfg.bbox, 4, 2, col, row);

        const micro = await prisma.microarea.upsert({
          where: { equipeId_codigo: { equipeId: equipe.id, codigo } },
          update: {},
          create: {
            equipeId: equipe.id,
            acsId: acs.id,
            codigo,
            populacaoEstimada: randomInt(200, 700),
            validada: true,
          },
        });
        await prisma.$executeRawUnsafe(
          `UPDATE "Microarea" SET geom = ST_GeomFromText($1, 4326) WHERE id = $2`,
          bboxPolygonWKT(cell),
          micro.id,
        );
        allMicroareas.push({ id: micro.id, bbox: cell });
        microIdx++;
      }
    }
    console.log(`    ${allMicroareas.length} microareas com geometria`);

    // 8. Domicilios (~500 per prefeitura) + Moradores
    const domicilioIds: string[] = [];
    const domPerMicro = Math.floor(500 / allMicroareas.length);

    for (const micro of allMicroareas) {
      for (let d = 0; d < domPerMicro; d++) {
        const nMoradores = randomInt(1, 5);
        const tipos: TipoDomicilio[] = [
          TipoDomicilio.CASA,
          TipoDomicilio.APARTAMENTO,
          TipoDomicilio.COMODO,
          TipoDomicilio.OUTRO,
        ];

        // Determine ultimaVisita distribution: 60% last month, 30% last quarter, 10% no visit
        let ultimaVisita: Date | null = null;
        const roll = Math.random();
        if (roll < 0.6) {
          ultimaVisita = randomDate(30);
        } else if (roll < 0.9) {
          ultimaVisita = randomDate(90);
        }

        const domicilio = await prisma.domicilio.create({
          data: {
            microareaId: micro.id,
            cep: `${randomInt(13000, 13999).toString().padStart(5, "0")}${randomInt(100, 999)}`,
            logradouro: randomItem(LOGRADOUROS),
            numero: randomInt(1, 999).toString(),
            complemento: Math.random() < 0.3 ? `Apto ${randomInt(1, 50)}` : undefined,
            bairro: randomItem(cfg.bairros),
            tipo: randomItem(tipos),
            nMoradores,
            ultimaVisita,
          },
        });
        const pt = randomPointInBBox(micro.bbox);
        await prisma.$executeRawUnsafe(
          `UPDATE "Domicilio" SET geom = ST_GeomFromText($1, 4326) WHERE id = $2`,
          pointWKT(pt.lng, pt.lat),
          domicilio.id,
        );
        domicilioIds.push(domicilio.id);

        // Create moradores
        for (let mo = 0; mo < nMoradores; mo++) {
          const sexo = Math.random() < 0.5 ? Sexo.MASCULINO : Sexo.FEMININO;
          const nome = sexo === Sexo.MASCULINO ? randomItem(NOMES_MASC) : randomItem(NOMES_FEM);
          const condicoes = generateCondicoes();
          const prioridade = condicoes.length > 0 ? Math.min(condicoes.length, 3) : 0;
          const vinculo =
            mo === 0 ? "responsavel" : randomItem(["conjuge", "filho", "neto", "outro"]);

          await prisma.morador.create({
            data: {
              domicilioId: domicilio.id,
              nome: `${nome} ${randomInt(1, 999)}`,
              nascimento: generateBirthdate(),
              sexo,
              condicoes,
              prioridade,
              vinculo,
            },
          });
        }
      }
    }
    console.log(`    ${domicilioIds.length} domicilios com moradores`);

    // 9. Visitas historicas (~200 por prefeitura, ultimos 60 dias)
    let visitaCount = 0;
    for (let v = 0; v < 200; v++) {
      const acs = randomItem(allAcs);
      const domId = randomItem(domicilioIds);
      const dataPrevista = randomDate(60);
      const statusRoll = Math.random();
      let status: StatusVisita;
      let dataRealizada: Date | null = null;
      let duracaoMin: number | null = null;
      let motivoRecusa: string | null = null;

      if (statusRoll < 0.7) {
        status = StatusVisita.REALIZADA;
        dataRealizada = new Date(dataPrevista);
        dataRealizada.setMinutes(dataRealizada.getMinutes() + randomInt(0, 60));
        duracaoMin = randomInt(10, 45);
      } else if (statusRoll < 0.85) {
        status = StatusVisita.AUSENTE;
      } else if (statusRoll < 0.95) {
        status = StatusVisita.RECUSADA;
        motivoRecusa = randomItem(["Morador ausente", "Recusou atendimento", "Doenca na familia"]);
      } else {
        status = StatusVisita.PENDENTE;
      }

      await prisma.visita.create({
        data: {
          acsId: acs.id,
          domicilioId: domId,
          dataPrevista,
          dataRealizada,
          status,
          motivoRecusa,
          duracaoMin,
          observacoes:
            status === StatusVisita.REALIZADA
              ? randomItem([
                  "Tudo em ordem",
                  "Medicacao ajustada",
                  "Encaminhado para UBS",
                  "Acompanhamento gestante",
                ])
              : undefined,
        },
      });
      visitaCount++;
    }
    console.log(`    ${visitaCount} visitas historicas`);

    // 10. Agenda do dia para cada ACS
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const acs of allAcs) {
      const acsDoms = domicilioIds.slice(0, randomInt(8, 15));
      const visitasOrdem = acsDoms.map((domId, idx) => ({
        ordem: idx + 1,
        domicilioId: domId,
        horaPrevista: `${(8 + Math.floor(idx * 0.5)).toString().padStart(2, "0")}:${idx % 2 === 0 ? "00" : "30"}`,
      }));

      await prisma.agendaDia.upsert({
        where: { acsId_data: { acsId: acs.id, data: hoje } },
        update: { visitasOrdem },
        create: {
          acsId: acs.id,
          data: hoje,
          visitasOrdem,
        },
      });
    }
    console.log(`    Agenda do dia gerada para ${allAcs.length} ACS`);
  }

  // 11. VISUALIZADOR user
  await prisma.usuario.upsert({
    where: { email: "visualizador@saudeterritorio.dev" },
    update: {},
    create: {
      email: "visualizador@saudeterritorio.dev",
      nome: "Visualizador Demo",
      papel: Papel.VISUALIZADOR,
      senhaHash: senhaDemo,
    },
  });
  console.log("\n  VISUALIZADOR: visualizador@saudeterritorio.dev");

  console.log("\n  Seed concluido com sucesso!");
  console.log("\n  === CREDENCIAIS DE DEMO ===");
  console.log("  admin@saudeterritorio.dev / admin123 (SUPERADMIN)");
  console.log("  coord.cl@saudeterritorio.dev / demo123 (COORD_MUNICIPAL Campo Limpo)");
  console.log("  coord.vp@saudeterritorio.dev / demo123 (COORD_MUNICIPAL Varzea)");
  console.log("  gerente.ubs1.cl@saudeterritorio.dev / demo123 (GERENTE_UBS)");
  console.log("  acs1.cl@demo / demo123 (ACS)");
  console.log("  visualizador@saudeterritorio.dev / demo123 (VISUALIZADOR)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
