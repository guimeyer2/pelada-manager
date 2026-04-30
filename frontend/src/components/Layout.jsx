import { Outlet, NavLink } from "react-router-dom";
import { useLang } from "../i18n/LangContext";
import { useTheme } from "../i18n/ThemeContext";

export default function Layout() {
  const { lang, toggle, t } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();

  const NAV_LINKS = [
    { to: "/", label: t("nav.matches"), end: true },
    { to: "/players", label: t("nav.players") },
    { to: "/stats", label: t("nav.stats") },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-3.5 relative flex items-center sticky top-0 z-10">
        <span className="text-green-600 dark:text-green-400 font-bold text-base tracking-tight shrink-0">
          Pelada Manager
        </span>

        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-150 ${
                  isActive
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button
            onClick={toggleTheme}
            className="text-sm px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-[background-color,color] duration-150"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            onClick={toggle}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-[background-color,color] duration-150"
          >
            {lang === "en" ? "PT" : "EN"}
          </button>
          <NavLink
            to="/new-match"
            className="text-sm font-medium bg-green-600 hover:bg-green-500 active:scale-[0.97] text-white px-4 py-1.5 rounded-lg transition-[transform,background-color] duration-150"
          >
            {t("nav.newMatch")}
          </NavLink>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
