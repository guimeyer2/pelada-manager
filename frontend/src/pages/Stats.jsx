import { useEffect, useState } from "react";
import { getDashboard, getPlayerStats } from "../api/client";
import { useLang } from "../i18n/LangContext";
import Spinner from "../components/Spinner";

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default function Stats() {
  const { t } = useLang();
  const [dash, setDash] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getPlayerStats()]).then(([d, p]) => {
      setDash(d.data);
      setPlayers(p.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("stats.title")}</h1>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatCard label={t("stats.matchesPlayed")} value={dash.total_matches} />
        <StatCard label={t("stats.totalCollected")} value={`R$ ${dash.total_collected.toFixed(2)}`} />
        <StatCard label={t("stats.myGoals")} value={dash.my_total_goals} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard label={t("stats.twoTeams")} value={dash.matches_6x6} />
        <StatCard label={t("stats.threeTeams")} value={dash.matches_5v5v5} />
        <StatCard label={t("stats.myGoals6x6")} value={dash.my_goals_6x6} />
      </div>

      <h2 className="text-lg font-semibold mb-4">{t("stats.perPlayer")}</h2>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-800">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("stats.colPlayer")}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("stats.colRating")}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("stats.colMatches")}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("stats.colAttendance")}</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("stats.colPaid")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {players.map((p) => (
              <tr key={p.player_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors duration-100">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.rating}</td>
                <td className="px-4 py-3">{p.total_matches}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.attendance_rate}%</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">R$ {p.total_paid_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
