import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NovaPelada from "./pages/NovaPelada";
import Pelada from "./pages/Pelada";
import Jogadores from "./pages/Jogadores";
import Stats from "./pages/Stats";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="nova-pelada" element={<NovaPelada />} />
          <Route path="pelada/:id" element={<Pelada />} />
          <Route path="jogadores" element={<Jogadores />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
