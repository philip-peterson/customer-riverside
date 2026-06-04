#!/bin/sh
echo "=== MOCK SENDMAIL (dev - email logged, not sent) ===" >&2
echo "Timestamp: $(date -Iseconds)" >&2
echo "Called as: $0 $*" >&2
echo "----- EMAIL CONTENT -----" >&2
cat >&2
echo "" >&2
echo "=== END MOCK SENDMAIL ===" >&2
exit 0
