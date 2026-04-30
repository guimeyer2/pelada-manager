import { useEffect, useState } from "react";
import { getDashboard, getStatsJogadores } from "../api/client";

function Card({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function Stats() {
  const [dash, setDash] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getStatsJogadores()]).then(([d, j]) => { setDash(d.data); setJogadores(j.data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Estatísticas</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Card label="Peladas realizadas" value={dash.total_peladas} />
        <Card label="Artilheiro" value={dash.artilheiro ?? "—"} />
        <Card label="Mais presente" value={dash.jogador_mais_presente ?? "—"} />
        <Card label="Peladas 6x6" value={dash.peladas_6x6} />
        <Card label="Peladas 5v5v5" value={dash.peladas_5v5v5} />
      </div>
      <h2 className="text-lg font-semibold mb-3">Por jogador</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4">Jogador</th>
              <th className="pb-2 pr-4">Rating</th>
              <th className="pb-2 pr-4">Peladas</th>
              <th className="pb-2 pr-4">Presença</th>
              <th className="pb-2">Gols</th>
            </tr>
          </thead>
          <tbody>
            {jogadores.map((j) => (
              <tr key={j.jogador_id} className="border-b border-gray-800/50 hover:bg-gray-900">
                <td className="py-2.5 pr-4 font-medium">{j.nome}</td>
                <td className="py-2.5 pr-4 text-gray-400">{j.rating}</td>
                <td className="py-2.5 pr-4">{j.total_peladas}</td>
                <td className="py-2.5 pr-4 text-gray-400">{j.percentual_presenca}%</td>
                <td className="py-2.5">{j.total_gols}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
