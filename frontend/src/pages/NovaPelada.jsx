import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMatch, addPlayers } from "../api/client";
import { useLang } from "../i18n/LangContext";

const inputClass =
  "bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 w-full text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-[border-color,box-shadow] duration-150";

export default function NewMatch() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [matchDate, setMatchDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [rawList, setRawList] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!matchDate) { setError(t("newMatch.dateMissing")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await createMatch({ date: matchDate });
      const id = res.data.id;
      if (rawList.trim()) {
        const names = rawList
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^\d+/.test(line))
          .map((line) =>
            line
              .replace(/^\d+[\.\-\)]\s*/, "")
              .replace(/\p{Extended_Pictographic}/gu, "")
              .trim()
          )
          .filter(Boolean);
        if (names.length > 0) await addPlayers(id, names);
      }
      navigate(`/match/${id}`);
    } catch {
      setError(t("newMatch.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">{t("newMatch.title")}</h1>
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">{t("newMatch.date")}</label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">
            {t("newMatch.listLabel")}{" "}
            <span className="text-gray-400 dark:text-gray-600">({t("newMatch.listHint")})</span>
          </label>
          <textarea
            rows={10}
            placeholder={t("newMatch.placeholder")}
            value={rawList}
            onChange={(e) => setRawList(e.target.value)}
            className={`${inputClass} font-mono text-sm resize-none`}
          />
        </div>
        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg transition-[transform,background-color] duration-150"
        >
          {loading ? t("newMatch.creating") : t("newMatch.submit")}
        </button>
      </div>
    </div>
  );
}
