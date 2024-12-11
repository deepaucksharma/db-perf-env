.PHONY: deploy reset logs clean

deploy:
	./scripts/deploy-local.sh

reset:
	./scripts/reset-local.sh

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -f
