import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Players
export const getPlayers = (activeOnly = true) => api.get("/players/", { params: { active_only: activeOnly } });
export const createPlayer = (data) => api.post("/players/", data);
export const updatePlayer = (id, data) => api.patch(`/players/${id}`, data);

// Matches
export const getMatches = () => api.get("/matches/");
export const getMatch = (id) => api.get(`/matches/${id}`);
export const createMatch = (data) => api.post("/matches/", data);
export const closeMatch = (id) => api.patch(`/matches/${id}/close`);
export const reopenMatch = (id) => api.patch(`/matches/${id}/reopen`);

// Match players
export const addPlayers = (matchId, names) => api.post(`/matches/${matchId}/players`, { names });
export const getMatchPlayers = (matchId) => api.get(`/matches/${matchId}/players`);
export const drawTeams = (matchId) => api.post(`/matches/${matchId}/draw`);
export const updatePayment = (matchId, mpId, paid) =>
  api.patch(`/matches/${matchId}/players/${mpId}/payment`, { paid });
export const updateGoals = (matchId, mpId, goals) =>
  api.patch(`/matches/${matchId}/players/${mpId}/goals`, { goals });
export const updateOrganizerGoals = (matchId, goals) =>
  api.patch(`/matches/${matchId}/organizer-goals`, { goals });
export const updateScore = (matchId, scoreA, scoreB) =>
  api.patch(`/matches/${matchId}/score`, { score_a: scoreA, score_b: scoreB });
export const deleteMatch = (id) => api.delete(`/matches/${id}`);
export const getPaymentReminder = (matchId, pixKey = "") =>
  api.get(`/matches/${matchId}/payment-reminder`, { params: { pix_key: pixKey } });

// Stats
export const getDashboard = () => api.get("/stats/dashboard");
export const getPlayerStats = () => api.get("/stats/players");

export default api;
