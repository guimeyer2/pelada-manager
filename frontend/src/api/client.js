import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getJogadores = () => api.get("/jogadores/");
export const criarJogador = (data) => api.post("/jogadores/", data);
export const atualizarJogador = (id, data) => api.patch(`/jogadores/${id}`, data);

export const getPeladas = () => api.get("/peladas/");
export const getPelada = (id) => api.get(`/peladas/${id}`);
export const criarPelada = (data) => api.post("/peladas/", data);
export const adicionarJogadores = (peladaId, nomes) => api.post(`/peladas/${peladaId}/jogadores`, { nomes });
export const getJogadoresPelada = (peladaId) => api.get(`/peladas/${peladaId}/jogadores`);
export const sortearTimes = (peladaId) => api.post(`/peladas/${peladaId}/sortear`);
export const atualizarPagamento = (peladaId, pjId, pago) => api.patch(`/peladas/${peladaId}/jogadores/${pjId}/pagamento`, { pago });
export const atualizarGols = (peladaId, pjId, gols) => api.patch(`/peladas/${peladaId}/jogadores/${pjId}/gols`, { gols });
export const getMensagemCobranca = (peladaId, chavePix = "") => api.get(`/peladas/${peladaId}/mensagem-cobranca`, { params: { chave_pix: chavePix } });

export const getDashboard = () => api.get("/stats/dashboard");
export const getStatsJogadores = () => api.get("/stats/jogadores");

export default api;
