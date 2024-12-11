.PHONY: deploy reset logs

deploy:
	./scripts/deploy-local.sh

reset:
	./scripts/reset-local.sh

logs:
	docker-compose logs -f
