import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPeladas } from "../api/client";

export default function Home() {
  const [peladas, setPeladas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPeladas().then((r) => setPeladas(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Peladas</h1>
      {peladas.length === 0 && <p className="text-gray-500">Nenhuma pelada ainda. Crie a primeira!</p>}
      <div className="flex flex-col gap-3">
        {peladas.map((p) => (
          <Link key={p.id} to={`/pelada/${p.id}`} className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 flex items-center justify-between hover:border-green-600 transition-colors">
            <div>
              <p className="font-semibold">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
              <p className="text-sm text-gray-400 mt-0.5">{p.formato ?? "—"} · {p.total_jogadores} jogadores · {p.total_pagos}/{p.total_jogadores} pagos</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${p.status === "aberta" ? "text-yellow-400" : "text-gray-500"}`}>{p.status}</span>
              {p.valor_por_jogador && <p className="text-sm text-gray-400">R$ {p.valor_por_jogador.toFixed(2)}/pessoa</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
