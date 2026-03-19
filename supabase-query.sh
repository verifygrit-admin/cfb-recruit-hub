#!/usr/bin/env bash
# supabase-query.sh — stable CLI query runner
# Sources .env.local for SUPABASE_DB_PASSWORD so the CLI does not prompt.
# Usage: ./supabase-query.sh "SELECT count(*) FROM public.profiles;"
#        ./supabase-query.sh  (defaults to schema check query)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  # Export only lines that look like VAR=VALUE (skip comments and blanks)
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    export "$key=$value"
  done < "$ENV_FILE"
  echo "[supabase-query] Loaded env from .env.local"
else
  echo "[supabase-query] WARNING: .env.local not found — CLI may prompt for password"
fi

QUERY="${1:-SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;}"

echo "[supabase-query] Running: $QUERY"
npx supabase db query "$QUERY" --linked
