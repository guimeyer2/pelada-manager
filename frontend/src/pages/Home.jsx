import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMatches } from "../api/client";
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

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("home.title")}</h1>
      {matches.length === 0 && (
        <p className="text-gray-500 text-sm">{t("home.empty")}</p>
      )}
      <div className="flex flex-col gap-2.5">
        {matches.map((match) => (
          <Link
            key={match.id}
            to={`/match/${match.id}`}
            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-700 hover:-translate-y-px transition-[transform,border-color] duration-150"
          >
            <div>
              <p className="font-semibold">
                {new Date(match.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {match.format ?? "—"} · {match.total_players} {t("home.players")} ·{" "}
                {match.total_paid}/{match.total_players} {t("home.paid")}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  match.status === "open"
                    ? "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {t(`status.${match.status}`)}
              </span>
              {match.fee_per_player && (
                <p className="text-sm text-gray-400">
                  R$ {match.fee_per_player.toFixed(2)}/{t("home.person")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
