import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // TODO: Implement in Block 4
  // 1. Create prefeituras (Campo Limpo Paulista + Varzea Paulista)
  // 2. Create SUPERADMIN user
  // 3. Create UBS, Equipes ESF, ACS per prefeitura
  // 4. Create microareas with synthetic polygons
  // 5. Create ~1000 domicilios with moradores
  // 6. Create historical visitas
  // 7. Generate today's agenda

  console.log("Seed completed (stub — full implementation in Block 4).");
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
