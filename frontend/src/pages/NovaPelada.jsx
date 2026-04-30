import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarPelada, adicionarJogadores } from "../api/client";

export default function NovaPelada() {
  const navigate = useNavigate();
  const [data, setData] = useState("");
  const [listaBruta, setListaBruta] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit() {
    if (!data) { setErro("Informe a data da pelada."); return; }
    setLoading(true);
    setErro("");
    try {
      const pelada = await criarPelada({ data });
      const id = pelada.data.id;
      if (listaBruta.trim()) {
        const nomes = listaBruta.split("\n").map((l) => l.replace(/^\d+[\.\-\)]\s*/, "").trim()).filter(Boolean);
        if (nomes.length > 0) await adicionarJogadores(id, nomes);
      }
      navigate(`/pelada/${id}`);
    } catch { setErro("Erro ao criar pelada."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Nova Pelada</h1>
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full text-gray-100 focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Lista do WhatsApp <span className="text-gray-600">(cole aqui, um nome por linha)</span></label>
          <textarea rows={10} placeholder={"1. João\n2. Pedro\n3. Lucas"} value={listaBruta} onChange={(e) => setListaBruta(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full text-gray-100 font-mono text-sm focus:outline-none focus:border-green-500 resize-none" />
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        <button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded transition-colors">{loading ? "Criando..." : "Criar Pelada"}</button>
      </div>
    </div>
  );
}
