.PHONY: back front all

back:
	cd backend && .venv/bin/uvicorn main:app --reload

front:
	cd frontend && npm run dev

all:
	@trap 'kill 0' SIGINT SIGTERM; \
	(cd backend && .venv/bin/uvicorn main:app --reload) & \
	(cd frontend && npm run dev) & \
	wait
