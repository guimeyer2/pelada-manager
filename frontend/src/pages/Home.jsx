import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMatches, deleteMatch } from "../api/client";
import { useLang } from "../i18n/LangContext";
import Spinner from "../components/Spinner";

export default function Home() {
  const { t } = useLang();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatches()
      .then((r) => setMatches(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!window.confirm(t("match.deleteConfirm"))) return;
    await deleteMatch(id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("home.title")}</h1>
      {matches.length === 0 && (
        <p className="text-gray-500 text-sm">{t("home.empty")}</p>
      )}
      <div className="flex flex-col gap-2.5">
        {matches.map((match, i) => (
          <div
            key={match.id}
            className="group flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-px transition-[transform,border-color] duration-150 animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Link
              to={`/match/${match.id}`}
              className="flex-1 flex items-center justify-between px-5 py-4 min-w-0"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {new Date(match.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {match.format ?? "—"} · {match.total_players} {t("home.players")} ·{" "}
                  {match.total_paid}/{match.total_players} {t("home.paid")}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      match.status === "open"
                        ? "bg-yellow-500/15 text-yellow-500 dark:text-yellow-400 ring-1 ring-yellow-500/20"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}
                  >
                    {t(`status.${match.status}`)}
                  </span>
                  {match.fee_per_player && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      R$ {match.fee_per_player.toFixed(2)}/{t("home.person")}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-150 text-xl leading-none">
                  ›
                </span>
              </div>
            </Link>
            <button
              onClick={() => handleDelete(match.id)}
              className="px-3 py-4 text-gray-300 dark:text-gray-700 hover:text-red-400 active:scale-[0.97] opacity-0 group-hover:opacity-100 transition-[opacity,transform,color] duration-150 text-base leading-none"
              title={t("match.delete")}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
