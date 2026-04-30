import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPelada, getJogadoresPelada, sortearTimes,
  atualizarPagamento, atualizarGols, getMensagemCobranca,
} from "../api/client";

const timeCores = { A: "bg-blue-900 text-blue-200", B: "bg-red-900 text-red-200", C: "bg-yellow-900 text-yellow-200" };

export default function Pelada() {
  const { id } = useParams();
  const [pelada, setPelada] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const [p, j] = await Promise.all([getPelada(id), getJogadoresPelada(id)]);
    setPelada(p.data);
    setJogadores(j.data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [id]);

  async function handleSortear() {
    await sortearTimes(id);
    carregar();
  }

  async function togglePago(pj) {
    await atualizarPagamento(id, pj.id, !pj.pago);
    setJogadores((prev) =>
      prev.map((j) => (j.id === pj.id ? { ...j, pago: !j.pago } : j))
    );
  }

  async function handleGols(pj, delta) {
    const novo = Math.max(0, pj.gols + delta);
    await atualizarGols(id, pj.id, novo);
    setJogadores((prev) =>
      prev.map((j) => (j.id === pj.id ? { ...j, gols: novo } : j))
    );
  }

  async function gerarCobranca() {
    const r = await getMensagemCobranca(id);
    setMensagem(r.data.mensagem);
  }

  async function copiar() {
    await navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const porTime = jogadores.reduce((acc, j) => {
    const key = j.time || "sem_time";
    if (!acc[key]) acc[key] = [];
    acc[key].push(j);
    return acc;
  }, {});

  const semTime = porTime["sem_time"] || [];
  const times = Object.entries(porTime).filter(([k]) => k !== "sem_time");
  const pendentes = jogadores.filter((j) => !j.pago);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Pelada {new Date(pelada.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </h1>
          <p className="text-gray-400 mt-1">
            {pelada.formato ?? "—"} · {jogadores.length} jogadores
            {pelada.valor_por_jogador && ` · R$ ${pelada.valor_por_jogador.toFixed(2)}/pessoa`}
          </p>
        </div>
        <button
          onClick={handleSortear}
          className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          Sortear Times
        </button>
      </div>

      {/* Times */}
      {times.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {times.map(([label, lista]) => {
            const media = (lista.reduce((s, j) => s + j.rating, 0) / lista.length).toFixed(1);
            return (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="font-semibold mb-3">
                  Time {label} <span className="text-gray-500 font-normal text-sm">média {media}</span>
                </p>
                <div className="flex flex-col gap-2">
                  {lista.map((j) => (
                    <div key={j.id} className="flex items-center justify-between">
                      <span className="text-sm">{j.nome}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleGols(j, -1)} className="text-gray-600 hover:text-white w-5 text-center">−</button>
                        <span className="text-sm w-4 text-center">{j.gols}</span>
                        <button onClick={() => handleGols(j, 1)} className="text-gray-600 hover:text-white w-5 text-center">+</button>
                        <button
                          onClick={() => togglePago(j)}
                          className={`text-xs px-2 py-0.5 rounded ml-1 ${j.pago ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-400"}`}
                        >
                          {j.pago ? "Pago" : "Pendente"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sem time ainda */}
      {semTime.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <p className="font-semibold mb-3 text-gray-400">Lista ({semTime.length})</p>
          <div className="flex flex-col gap-2">
            {semTime.map((j) => (
              <div key={j.id} className="flex items-center justify-between">
                <span className="text-sm">{j.nome} <span className="text-gray-600">({j.rating})</span></span>
                <button
                  onClick={() => togglePago(j)}
                  className={`text-xs px-2 py-0.5 rounded ${j.pago ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-400"}`}
                >
                  {j.pago ? "Pago" : "Pendente"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cobrança */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">
            Pagamentos{" "}
            <span className="text-gray-500 font-normal text-sm">
              {jogadores.filter((j) => j.pago).length}/{jogadores.length} pagos
            </span>
          </p>
          <button
            onClick={gerarCobranca}
            disabled={pendentes.length === 0}
            className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-3 py-1 rounded transition-colors"
          >
            Gerar mensagem
          </button>
        </div>

        {mensagem && (
          <div className="mt-2">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-950 rounded p-3 font-sans">
              {mensagem}
            </pre>
            <button
              onClick={copiar}
              className="mt-2 text-sm text-green-400 hover:text-green-300"
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
