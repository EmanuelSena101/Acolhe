"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle, Plus, Trash2, UserPlus } from "lucide-react";

export default function MicroareasPage() {
  const [selectedEquipeId, setSelectedEquipeId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodigo, setNewCodigo] = useState("");
  const [assigningMicroareaId, setAssigningMicroareaId] = useState<string | null>(null);
  const [selectedAcsId, setSelectedAcsId] = useState<string>("");
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const [selectedPrefeituraId, setSelectedPrefeituraId] = useState<string | null>(null);
  const prefeituraId = selectedPrefeituraId ?? prefeituras?.[0]?.id ?? null;

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: equipes } = trpc.equipe.list.useQuery(
    { ubsId: ubsList?.[0]?.id ?? "" },
    { enabled: !!ubsList?.length },
  );

  const { data: microareas } = trpc.microarea.list.useQuery({
    equipeId: selectedEquipeId ?? undefined,
  });

  const { data: acsList } = trpc.acs.list.useQuery(
    { equipeId: selectedEquipeId ?? undefined },
    { enabled: !!selectedEquipeId },
  );

  const { data: validation } = trpc.microarea.validate.useQuery(
    { id: validatingId! },
    { enabled: !!validatingId },
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.microarea.create.useMutation({
    onSuccess: () => {
      setShowCreateForm(false);
      setNewCodigo("");
      void utils.microarea.list.invalidate();
    },
  });

  const assignMutation = trpc.microarea.assignAcs.useMutation({
    onSuccess: () => {
      setAssigningMicroareaId(null);
      setSelectedAcsId("");
      void utils.microarea.list.invalidate();
    },
  });

  const deleteMutation = trpc.microarea.delete.useMutation({
    onSuccess: () => {
      void utils.microarea.list.invalidate();
    },
  });

  const handleCreate = () => {
    if (!selectedEquipeId || !newCodigo.trim()) return;
    createMutation.mutate({ equipeId: selectedEquipeId, codigo: newCodigo.trim() });
  };

  const handleAssign = () => {
    if (!assigningMicroareaId) return;
    assignMutation.mutate({
      id: assigningMicroareaId,
      acsId: selectedAcsId || null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta microarea?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Microareas</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {prefeituras && prefeituras.length > 1 && (
          <select
            value={prefeituraId ?? ""}
            onChange={(e) => setSelectedPrefeituraId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {prefeituras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedEquipeId ?? ""}
          onChange={(e) => setSelectedEquipeId(e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todas as equipes</option>
          {equipes?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>

        {selectedEquipeId && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova microarea
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && selectedEquipeId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-blue-900">Nova microarea</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCodigo}
              onChange={(e) => setNewCodigo(e.target.value)}
              placeholder="Codigo (ex: MA-01)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              maxLength={10}
            />
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newCodigo.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCodigo("");
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
          {createMutation.error && (
            <p className="mt-2 text-sm text-red-600">{createMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Microareas list */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Codigo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Equipe
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                ACS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Domicilios
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Populacao est.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                PNAB
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {microareas?.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: m.equipe.cor }}
                    />
                    {m.codigo}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {m.equipe.nome}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {assigningMicroareaId === m.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedAcsId}
                        onChange={(e) => setSelectedAcsId(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        <option value="">Nenhum</option>
                        {acsList?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.usuario.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        disabled={assignMutation.isPending}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setAssigningMicroareaId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <span>
                      {m.acs?.usuario.nome ?? <span className="text-gray-400">Sem ACS</span>}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {m._count.domicilios}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {m._count.domicilios * 3}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {validatingId === m.id && validation ? (
                    validation.valida ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Valida
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        {validation.erros.join(", ")}
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => setValidatingId(m.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Validar
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAssigningMicroareaId(m.id);
                        setSelectedAcsId(m.acs?.id ?? "");
                      }}
                      className="text-gray-400 hover:text-blue-600"
                      title="Atribuir ACS"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!microareas || microareas.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {selectedEquipeId
                    ? "Nenhuma microarea encontrada para esta equipe."
                    : "Selecione uma equipe para ver as microareas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
