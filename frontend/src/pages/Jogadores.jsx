import { useEffect, useState } from "react";
import { getJogadores, criarJogador, atualizarJogador } from "../api/client";

export default function Jogadores() {
  const [jogadores, setJogadores] = useState([]);
  const [nome, setNome] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);

  async function carregar() { const r = await getJogadores(); setJogadores(r.data); setLoading(false); }
  useEffect(() => { carregar(); }, []);

  async function handleCriar() {
    if (!nome.trim()) return;
    await criarJogador({ nome: nome.trim(), rating: Number(rating) });
    setNome(""); setRating(5); carregar();
  }

  async function handleRatingChange(id, novoRating) {
    await atualizarJogador(id, { rating: Number(novoRating) });
    setJogadores((prev) => prev.map((j) => j.id === id ? { ...j, rating: Number(novoRating) } : j));
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Jogadores</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-400 mb-3">Novo jogador</p>
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCriar()} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:border-green-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Rating</label>
            <input type="number" min={1} max={10} step={0.5} value={rating} onChange={(e) => setRating(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-20 focus:outline-none focus:border-green-500" />
          </div>
          <button onClick={handleCriar} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors">Adicionar</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {jogadores.map((j) => (
          <div key={j.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="font-medium">{j.nome}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Rating</label>
                <input type="number" min={1} max={10} step={0.5} value={j.rating} onChange={(e) => handleRatingChange(j.id, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-16 focus:outline-none focus:border-green-500" />
              </div>
              <button onClick={() => atualizarJogador(j.id, { ativo: false }).then(carregar)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
