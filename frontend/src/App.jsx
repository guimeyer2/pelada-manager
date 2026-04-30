import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LangProvider } from "./i18n/LangContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NewMatch from "./pages/NovaPelada";
import Match from "./pages/Pelada";
import Players from "./pages/Jogadores";
import Stats from "./pages/Stats";

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="new-match" element={<NewMatch />} />
            <Route path="match/:id" element={<Match />} />
            <Route path="players" element={<Players />} />
            <Route path="stats" element={<Stats />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}
