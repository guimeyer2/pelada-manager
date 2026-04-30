import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMatch,
  getMatchPlayers,
  drawTeams,
  closeMatch,
  reopenMatch,
  updatePayment,
  updateOrganizerGoals,
  updateScore,
  getPaymentReminder,
  deleteMatch,
} from "../api/client";
import { useLang } from "../i18n/LangContext";
import Spinner from "../components/Spinner";

const TEAM_KEYS   = { A: "teams.black", B: "teams.white", C: "teams.colorful" };
const TEAM_BORDER = { A: "border-l-gray-400", B: "border-l-gray-300 dark:border-l-gray-100", C: "border-l-orange-400" };
const TEAM_LABEL  = { A: "text-gray-600 dark:text-gray-300", B: "text-gray-800 dark:text-white", C: "text-orange-400" };

const paidBadge =
  "text-xs px-2.5 py-0.5 rounded-full font-medium ring-1 transition-[background-color,color] duration-150 active:scale-[0.97]";

const scoreBtn =
  "w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-90 text-gray-600 dark:text-gray-300 text-lg transition-[transform,background-color] duration-100";

export default function Match() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();

  const [match, setMatch]             = useState(null);
  const [players, setPlayers]         = useState([]);
  const [reminder, setReminder]       = useState("");
  const [copied, setCopied]           = useState(false);
  const [copiedTeams, setCopiedTeams] = useState(false);
  const [loading, setLoading]         = useState(true);

  async function load() {
    const [m, p] = await Promise.all([getMatch(id), getMatchPlayers(id)]);
    setMatch(m.data);
    setPlayers(p.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleDraw() {
    await drawTeams(id);
    load();
  }

  async function handleClose() {
    await closeMatch(id);
    load();
  }

  async function handleReopen() {
    await reopenMatch(id);
    load();
  }

  async function handleDelete() {
    if (!window.confirm(t("match.deleteConfirm"))) return;
    await deleteMatch(id);
    navigate("/");
  }

  async function togglePaid(player) {
    await updatePayment(id, player.id, !player.paid);
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, paid: !player.paid } : p))
    );
  }

  async function handleMyGoals(delta) {
    const newGoals = Math.max(0, (match.organizer_goals ?? 0) + delta);
    const res = await updateOrganizerGoals(id, newGoals);
    setMatch(res.data);
  }

  async function handleScore(deltaA, deltaB) {
    const newA = Math.max(0, (match.score_a ?? 0) + deltaA);
    const newB = Math.max(0, (match.score_b ?? 0) + deltaB);
    const res = await updateScore(id, newA, newB);
    setMatch(res.data);
  }

  async function generateReminder() {
    const r = await getPaymentReminder(id);
    setReminder(r.data.message);
  }

  async function copyReminder() {
    await navigator.clipboard.writeText(reminder);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyTeamsMessage() {
    await navigator.clipboard.writeText(teamsMessage);
    setCopiedTeams(true);
    setTimeout(() => setCopiedTeams(false), 2000);
  }

  if (loading) return <Spinner />;

  const byTeam = players.reduce((acc, p) => {
    const key = p.team || "no_team";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const unassigned = byTeam["no_team"] || [];
  const teams = Object.entries(byTeam)
    .filter(([k]) => k !== "no_team")
    .sort(([a], [b]) => a.localeCompare(b));
  const unpaid = players.filter((p) => !p.paid);
  const isOpen = match.status === "open";
  const isTwoTeams = teams.length === 2;

  const teamsMessage = teams
    .map(([label, list]) => {
      const tName = t(TEAM_KEYS[label] ?? label);
      return `*${t("match.teamPrefix")} ${tName}:*\n${list.map((p) => `- ${p.name}`).join("\n")}`;
    })
    .join("\n\n");

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {new Date(match.date + "T12:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {match.format ?? "—"} · {players.length} {t("match.players")}
            {match.fee_per_player && ` · R$ ${match.fee_per_player.toFixed(2)}/${t("match.person")}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isOpen ? (
            <>
              <button
                onClick={handleDraw}
                className="bg-green-600 hover:bg-green-500 active:scale-[0.97] text-white text-sm font-medium px-4 py-2 rounded-lg transition-[transform,background-color] duration-150"
              >
                {teams.length > 0 ? t("match.reshuffle") : t("match.draw")}
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-[0.97] text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-[transform,background-color] duration-150"
              >
                {t("match.close")}
              </button>
            </>
          ) : (
            <button
              onClick={handleReopen}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-[0.97] text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-[transform,background-color] duration-150"
            >
              {t("match.reopen")}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-gray-400 dark:text-gray-600 hover:text-red-400 active:scale-[0.97] text-sm px-3 py-2 rounded-lg transition-[transform,color] duration-150"
          >
            {t("match.delete")}
          </button>
        </div>
      </div>

      {/* Teams */}
      {teams.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {teams.map(([label, list]) => {
              const avg = (list.reduce((s, p) => s + p.rating, 0) / list.length).toFixed(1);
              const teamName = t(TEAM_KEYS[label] ?? label);
              return (
                <div
                  key={label}
                  className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-l-4 ${TEAM_BORDER[label] ?? "border-l-gray-400"} rounded-xl p-4`}
                >
                  <p className={`font-semibold mb-3 ${TEAM_LABEL[label] ?? "text-gray-600 dark:text-gray-300"}`}>
                    {t("match.teamPrefix")} {teamName}{" "}
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">{t("match.avg")} {avg}</span>
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {list.map((player) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-200">{player.name}</span>
                        <button
                          onClick={() => togglePaid(player)}
                          className={`${paidBadge} ${
                            player.paid
                              ? "bg-green-500/20 text-green-600 dark:text-green-400 ring-green-500/30"
                              : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 ring-gray-200 dark:ring-gray-600/40"
                          }`}
                        >
                          {player.paid ? t("match.paid") : t("match.pending")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoreboard — 2 teams only */}
          {isTwoTeams && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-4">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-6 text-center">{t("match.score")}</p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-3">
                  <span className={`text-[11px] uppercase tracking-widest font-medium ${TEAM_LABEL.A}`}>{t("teams.black")}</span>
                  <span className="text-7xl font-bold tabular-nums leading-none">
                    {match.score_a ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleScore(-1, 0)} className={scoreBtn}>−</button>
                    <button onClick={() => handleScore(1, 0)} className={scoreBtn}>+</button>
                  </div>
                </div>
                <span className="text-3xl text-gray-200 dark:text-gray-800 font-bold leading-none mb-6">×</span>
                <div className="flex flex-col items-center gap-3">
                  <span className={`text-[11px] uppercase tracking-widest font-medium ${TEAM_LABEL.B}`}>{t("teams.white")}</span>
                  <span className="text-7xl font-bold tabular-nums leading-none">
                    {match.score_b ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleScore(0, -1)} className={scoreBtn}>−</button>
                    <button onClick={() => handleScore(0, 1)} className={scoreBtn}>+</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teams message */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("match.teamsMsg")}</p>
              <button
                onClick={copyTeamsMessage}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 active:scale-[0.97] transition-[transform,color] duration-150"
              >
                {copiedTeams ? t("match.copied") : t("match.copy")}
              </button>
            </div>
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {teamsMessage}
            </pre>
          </div>
        </>
      )}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-8">
          <p className="font-medium text-gray-500 dark:text-gray-400 mb-3 text-sm">
            {t("match.list")} ({unassigned.length} {t("match.players")})
          </p>
          <div className="flex flex-col gap-2">
            {unassigned.map((player) => (
              <div key={player.id} className="flex items-center justify-between">
                <span className="text-sm">
                  {player.name}{" "}
                  <span className="text-gray-400 dark:text-gray-600 text-xs">({player.rating})</span>
                </span>
                <button
                  onClick={() => togglePaid(player)}
                  className={`${paidBadge} ${
                    player.paid
                      ? "bg-green-500/20 text-green-600 dark:text-green-400 ring-green-500/30"
                      : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 ring-gray-200 dark:ring-gray-600/40"
                  }`}
                >
                  {player.paid ? t("match.paid") : t("match.pending")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My goals */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4">
        <p className="font-semibold mb-3">{t("match.myGoals")}</p>
        <div className="flex items-center gap-3">
          <button onClick={() => handleMyGoals(-1)} className={scoreBtn}>−</button>
          <span className="text-3xl font-bold w-10 text-center tabular-nums">
            {match.organizer_goals ?? 0}
          </span>
          <button onClick={() => handleMyGoals(1)} className={scoreBtn}>+</button>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">
            {t("match.payments")}{" "}
            <span className="text-gray-500 font-normal text-sm">
              {players.filter((p) => p.paid).length}/{players.length} {t("match.paid").toLowerCase()}
            </span>
          </p>
          <button
            onClick={generateReminder}
            disabled={unpaid.length === 0}
            className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-[transform,background-color] duration-150"
          >
            {t("match.generateReminder")}
          </button>
        </div>
        {players.length > 0 && (
          <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green-500/70 rounded-full transition-[width] duration-300"
              style={{ width: `${(players.filter((p) => p.paid).length / players.length) * 100}%` }}
            />
          </div>
        )}
        {reminder && (
          <div className="mt-3">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-3 font-sans">
              {reminder}
            </pre>
            <button
              onClick={copyReminder}
              className="mt-2 text-sm text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 active:scale-[0.97] transition-[transform,color] duration-150"
            >
              {copied ? t("match.copied") : t("match.copyClipboard")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
