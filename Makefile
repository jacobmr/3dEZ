.PHONY: dev dev-down dev-logs backend-shell frontend-shell lint test build clean deploy deploy-down deploy-logs

dev:
	docker compose up -d

dev-down:
	docker compose down

dev-logs:
	docker compose logs -f

backend-shell:
	docker compose exec backend bash

frontend-shell:
	docker compose exec frontend sh

lint:
	docker compose exec backend ruff check src/ & \
	docker compose exec frontend npm run lint & \
	wait

test:
	docker compose exec backend pytest & \
	docker compose exec frontend npm test & \
	wait

build:
	docker compose build

clean:
	docker compose down -v --rmi local
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/.next

deploy:
	docker compose -f docker-compose.prod.yml up -d --build

deploy-down:
	docker compose -f docker-compose.prod.yml down

deploy-logs:
	docker compose -f docker-compose.prod.yml logs -f
