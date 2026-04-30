# Pelada Manager

Aplicação web para organizar peladas semanais — lista, times equilibrados, pagamentos e histórico.

## Rodando localmente

### Backend
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload
```
API em `http://localhost:8000` · Docs em `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App em `http://localhost:5173`
