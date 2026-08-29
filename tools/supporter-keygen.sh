#!/bin/bash
# Generate a Nebel supporter key, print it ONCE, and append its sha256 to the
# public allowlist (supporter-keys.txt). Run from anywhere; commits nothing.
#
# Usage: tools/supporter-keygen.sh "Patreon display name"
set -euo pipefail

cd "$(dirname "$0")/.."
ALLOWLIST="supporter-keys.txt"
LABEL="${1:-patron}"

# Crockford base32 (no ambiguous chars), 16 chars as 4x4 groups.
raw=$(head -c 10 /dev/urandom | base32 | tr -d '=' | tr 'A-Z' 'a-z' | head -c 16)
key="nbl-$(echo "$raw" | sed 's/\(....\)/\1-/g;s/-$//')"

# Same normalization as nebel_supporter_hash in update-lib.
hash=$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]-' | sha256sum | cut -d' ' -f1)

if grep -qix "$hash" "$ALLOWLIST"; then
    echo "collision (impossibly unlucky), rerun" >&2
    exit 1
fi
printf '# %s (%s)\n%s\n' "$LABEL" "$(date -u +%Y-%m-%d)" "$hash" >> "$ALLOWLIST"

cat <<EOF
Supporter key for: $LABEL
Send this to the patron (private):

    $key

Hash appended to $ALLOWLIST - commit and push to activate.
EOF
