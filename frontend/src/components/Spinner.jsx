import { useLang } from "../i18n/LangContext";

export default function Spinner() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2 text-gray-500 pt-4">
      <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-700 border-t-green-500 rounded-full animate-spin" />
      <span className="text-sm">{t("loading")}</span>
    </div>
  );
}
