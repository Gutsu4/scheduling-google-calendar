# Docker development commands
.PHONY: help build up down restart logs shell clean install dev

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker containers
	docker-compose build

up: ## Start the containers in detached mode
	docker-compose up -d

down: ## Stop and remove the containers
	docker-compose down

restart: ## Restart the containers
	docker-compose restart

logs: ## Show container logs
	docker-compose logs -f

shell: ## Open a shell in the web container
	docker-compose exec web sh

clean: ## Remove containers, networks, and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

install: ## Install dependencies
	docker-compose exec web pnpm install

dev: ## Start development server (build and up)
	docker-compose up --build

# Quick development workflow
start: build up ## Build and start development environment

stop: down ## Stop development environment