import { useEffect, useRef, useState } from "react";
import { getPlayers, createPlayer, updatePlayer } from "../api/client";
import { useLang } from "../i18n/LangContext";
import Spinner from "../components/Spinner";

function ratingColor(r) {
  if (r >= 8) return "text-green-500 dark:text-green-400";
  if (r >= 6) return "text-yellow-500 dark:text-yellow-400";
  return "text-orange-500 dark:text-orange-400";
}

const inputClass =
  "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-[border-color,box-shadow] duration-150";

export default function Players() {
  const { t } = useLang();
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [aliasInputs, setAliasInputs] = useState({});
  const aliasRefs = useRef({});

  async function load() {
    const r = await getPlayers();
    setPlayers(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await createPlayer({ name: name.trim(), rating: Number(rating) });
    setName("");
    setRating(5);
    load();
  }

  async function handleRatingChange(id, newRating) {
    await updatePlayer(id, { rating: Number(newRating) });
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rating: Number(newRating) } : p))
    );
  }

  async function addAlias(player, e) {
    e.preventDefault();
    const alias = (aliasInputs[player.id] || "").trim().toLowerCase();
    if (!alias || player.aliases.includes(alias)) return;
    const newAliases = [...player.aliases, alias];
    await updatePlayer(player.id, { aliases: newAliases });
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, aliases: newAliases } : p))
    );
    setAliasInputs((prev) => ({ ...prev, [player.id]: "" }));
  }

  async function removeAlias(player, alias) {
    const newAliases = player.aliases.filter((a) => a !== alias);
    await updatePlayer(player.id, { aliases: newAliases });
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, aliases: newAliases } : p))
    );
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("players.title")}</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">{t("players.addSection")}</p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder={t("players.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={`${inputClass} flex-1 min-w-40`}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">{t("players.rating")}</label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className={`${inputClass} w-20`}
            />
          </div>
          <button
            onClick={handleCreate}
            className="bg-green-600 hover:bg-green-500 active:scale-[0.97] text-white text-sm font-medium px-4 py-2 rounded-lg transition-[transform,background-color] duration-150"
          >
            {t("players.add")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-2 hover:border-gray-300 dark:hover:border-gray-700 transition-[border-color] duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{player.name}</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">{t("players.rating")}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={player.rating}
                    onChange={(e) => handleRatingChange(player.id, e.target.value)}
                    className={`bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-sm w-16 text-center focus:outline-none focus:border-green-500 transition-[border-color] duration-150 font-medium ${ratingColor(player.rating)}`}
                  />
                </div>
                <button
                  onClick={() => updatePlayer(player.id, { active: false }).then(load)}
                  className="text-xs text-gray-400 dark:text-gray-600 hover:text-red-400 active:scale-[0.97] transition-[transform,color] duration-150"
                >
                  {t("players.remove")}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {player.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full"
                >
                  {alias}
                  <button
                    onClick={() => removeAlias(player, alias)}
                    className="text-gray-400 dark:text-gray-600 hover:text-red-400 leading-none transition-colors duration-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              <form onSubmit={(e) => addAlias(player, e)} className="flex items-center">
                <input
                  ref={(el) => { aliasRefs.current[player.id] = el; }}
                  type="text"
                  placeholder="+ alias"
                  value={aliasInputs[player.id] || ""}
                  onChange={(e) =>
                    setAliasInputs((prev) => ({ ...prev, [player.id]: e.target.value }))
                  }
                  className="text-xs w-20 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-green-500 focus:outline-none text-gray-500 dark:text-gray-400 placeholder:text-gray-400 dark:placeholder:text-gray-600 pb-0.5 transition-[border-color] duration-150"
                />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
