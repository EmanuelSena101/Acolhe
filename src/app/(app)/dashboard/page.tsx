import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Painel de Gestao</h1>
      <p className="mt-2 text-gray-600">
        Bem-vindo, {session?.user?.nome}. Papel: {session?.user?.papel}
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Total Domicilios</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Cobertura Mensal</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">—%</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Visitas Atrasadas</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">ACS Ativos</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">—</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-400">
        Mapa e KPIs serao implementados nos proximos blocos.
      </p>
    </div>
  );
}
