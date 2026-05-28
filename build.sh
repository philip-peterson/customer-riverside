#!/usr/bin/env bash
# Convenience wrapper for the Makefile
set -euo pipefail

make docker-build-push "$@"

