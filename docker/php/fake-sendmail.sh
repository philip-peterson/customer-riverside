#!/bin/sh
# Fake sendmail for local development.
# Instead of delivering email, it prints the entire message to stderr
# so it appears in `docker compose logs`.
# This prevents "sh: 1: /usr/sbin/sendmail: not found" errors.

echo "=== MOCK SENDMAIL: email would have been sent (logged instead) ===" >&2
echo "Timestamp: $(date -Iseconds)" >&2
echo "Args: $*" >&2
echo "----------------------------------------" >&2
cat >&2
echo "" >&2
echo "=== END MOCK SENDMAIL ===" >&2

exit 0
