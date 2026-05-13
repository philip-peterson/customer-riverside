shell:
	docker compose exec app bash

drush:
	docker compose exec app drush $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
