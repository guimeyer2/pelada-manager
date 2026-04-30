import { Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="text-green-400 font-bold text-lg">Pelada Manager</span>
        <div className="flex gap-4 ml-4">
          {[{ to: "/", label: "Peladas", end: true }, { to: "/jogadores", label: "Jogadores" }, { to: "/stats", label: "Stats" }].map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `text-sm font-medium px-3 py-1 rounded transition-colors ${isActive ? "bg-green-500 text-gray-950" : "text-gray-400 hover:text-gray-100"}`}>{label}</NavLink>
          ))}
        </div>
        <NavLink to="/nova-pelada" className="ml-auto text-sm font-medium bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded transition-colors">+ Nova Pelada</NavLink>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8"><Outlet /></main>
    </div>
  );
}
