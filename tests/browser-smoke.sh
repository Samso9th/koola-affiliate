#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SCRATCH_DIR=$(mktemp -d /tmp/koola-partner-smoke.XXXXXX)
PG_BIN=${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}
PG_PORT=55443
REDIS_PORT=56393
API_PORT=4013
cleanup() {
  kill "${API_PID:-}" "${VITE_PID:-}" 2>/dev/null || true
  wait "${API_PID:-}" "${VITE_PID:-}" 2>/dev/null || true
  "$PG_BIN/pg_ctl" -D "$SCRATCH_DIR/pg" -m immediate stop >/dev/null 2>&1 || true
  redis-cli -h 127.0.0.1 -p "$REDIS_PORT" shutdown nosave >/dev/null 2>&1 || true
  rm -rf "$SCRATCH_DIR"
}
trap cleanup EXIT
"$PG_BIN/initdb" -D "$SCRATCH_DIR/pg" -A trust -U scratch >/dev/null
"$PG_BIN/pg_ctl" -D "$SCRATCH_DIR/pg" -l "$SCRATCH_DIR/postgres.log" -o "-h 127.0.0.1 -p $PG_PORT -k $SCRATCH_DIR" -w start >/dev/null
"$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" -U scratch koola_partner_smoke
redis-server --bind 127.0.0.1 --port "$REDIS_PORT" --save '' --appendonly no --daemonize yes --pidfile "$SCRATCH_DIR/redis.pid" --logfile "$SCRATCH_DIR/redis.log"
export DATABASE_URL="postgres://scratch@127.0.0.1:$PG_PORT/koola_partner_smoke"
export REDIS_URL="redis://127.0.0.1:$REDIS_PORT"
export JWT_SECRET='scratch-secret-with-more-than-32-characters'
export PORT="$API_PORT"
node ../api/dist/scripts/migrate.js
SCRATCH_PASSWORD_FILE="$SCRATCH_DIR/password" node --input-type=module - <<'JS'
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { database } from '../api/dist/src/db.js';
import { hashPassword } from '../api/dist/src/security.js';
const d = database(process.env.DATABASE_URL);
try {
  const id = randomUUID();
  const password = 'TemporaryPartnerPassword123!';
  await d.Affiliate.create({ id, name: 'Amina Yusuf', email: 'amina@example.test', phone: '+2348012345678', status: 'active', referral_code: 'K' + 'A'.repeat(24), commission_bps: 2500, commission_cap_bps: 4000, password_hash: await hashPassword(password), token_version: 0, identity_status: 'verified', identity_type: 'nin', identity_last4: '8901', created_at: new Date() });
  await d.Lead.create({ id: randomUUID(), name: 'Kano Kitchen', email: 'kitchen@example.test', phone: '+2348012345678', city: 'Kano', role: 'vendor', consent: true, affiliate_id: id, referral_code: 'K' + 'A'.repeat(24), created_at: new Date() });
  writeFileSync(process.env.SCRATCH_PASSWORD_FILE, password, { mode: 0o600 });
} finally { await d.db.close(); }
JS
node ../api/dist/src/server.js > "$SCRATCH_DIR/api.log" 2>&1 & API_PID=$!
VITE_API_BASE_URL="http://127.0.0.1:$API_PORT" node node_modules/vite/bin/vite.js --host 127.0.0.1 > "$SCRATCH_DIR/vite.log" 2>&1 & VITE_PID=$!
for _ in $(seq 1 40); do if curl -fsS "http://127.0.0.1:$API_PORT/health/ready" >/dev/null 2>&1 && curl -fsS 'http://127.0.0.1:5175/' >/dev/null 2>&1; then break; fi; sleep 0.25; done
SCRATCH_PASSWORD_FILE="$SCRATCH_DIR/password" node tests/browser-smoke.mjs
