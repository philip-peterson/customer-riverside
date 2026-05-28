shell:
	docker compose exec app bash

drush:
	docker compose exec app drush $(filter-out $@,$(MAKECMDGOALS))

%:
	@:

# =============================================================================
# Docker build & publish targets
# Target registry: forge.quinefoundation.com/ironmagma/riverside
# =============================================================================

REGISTRY ?= forge.quinefoundation.com/ironmagma
IMAGE    ?= riverside
TAG      ?= latest
PLATFORM ?= linux/amd64,linux/arm64

IMAGE_NAME := $(REGISTRY)/$(IMAGE):$(TAG)

.PHONY: docker-build docker-push docker-push-latest help

# Build the multi-arch image locally (does NOT push)
docker-build:
	docker buildx build --platform $(PLATFORM) -t $(IMAGE_NAME) .

# Build (if needed) + push to the registry
docker-push:
	docker buildx build --platform $(PLATFORM) -t $(IMAGE_NAME) --push .

# Convenience: push the :latest tag to Forge (will build if necessary)
docker-push-latest:
	$(MAKE) docker-push TAG=latest

# Two-step workflow example:
#   1. make docker-build                 # build locally first
#   2. make docker-push-latest           # then push to forge.../riverside:latest

help:
	@echo "Docker image targets (pushes to $(REGISTRY)/$(IMAGE))"
	@echo ""
	@echo "  make docker-build          Build multi-arch image locally (no push)"
	@echo "  make docker-push           Build + push $(IMAGE_NAME)"
	@echo "  make docker-push-latest    Push to $(REGISTRY)/$(IMAGE):latest"
	@echo ""
	@echo "Two-step workflow (build first, then push to latest):"
	@echo "  make docker-build"
	@echo "  make docker-push-latest"
	@echo ""
	@echo "Variables (can be overridden):"
	@echo "  REGISTRY=$(REGISTRY)"
	@echo "  IMAGE=$(IMAGE)"
	@echo "  TAG=$(TAG)"
	@echo "  PLATFORM=$(PLATFORM)"
