#!/usr/bin/env bash
#
# Prove the nightly furkanunsalan-pg backups actually restore. Restores the most
# recent dump into a THROWAWAY database, asserts it contains data, then drops it.
# Never touches the live database. Meant to run on the VPS via a systemd timer.
#
# Wire it up (as root on the VPS):
#
#   cp scripts/pg-restore-test.sh /root/pg-restore-test.sh && chmod +x /root/pg-restore-test.sh
#
#   cat >/etc/systemd/system/furkanunsalan-pg-restore-test.service <<'UNIT'
#   [Unit]
#   Description=Verify furkanunsalan-pg backup restores
#   [Service]
#   Type=oneshot
#   ExecStart=/root/pg-restore-test.sh
#   UNIT
#
#   cat >/etc/systemd/system/furkanunsalan-pg-restore-test.timer <<'TIMER'
#   [Unit]
#   Description=Weekly furkanunsalan-pg backup restore test
#   [Timer]
#   OnCalendar=Sun 04:00
#   Persistent=true
#   [Install]
#   WantedBy=timers.target
#   TIMER
#
#   systemctl daemon-reload && systemctl enable --now furkanunsalan-pg-restore-test.timer
#
# A failed run leaves a non-zero unit result that `systemctl --failed` (and your
# Uptime-Kuma/Beszel checks) can alert on.

set -euo pipefail

CONTAINER="${PG_CONTAINER:-furkanunsalan-pg}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/furkanunsalan-pg}"
PGUSER="${PGUSER:-postgres}"
PROBE_TABLE="${PROBE_TABLE:-posts}"
SCRATCH="restore_test_$(date +%s)"

latest="$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1 || true)"
if [ -z "$latest" ]; then
  echo "FAIL: no *.dump found in $BACKUP_DIR" >&2
  exit 1
fi
echo "Latest dump: $latest ($(du -h "$latest" | cut -f1))"

cleanup() {
  docker exec -i "$CONTAINER" rm -f /tmp/rt.dump >/dev/null 2>&1 || true
  docker exec -i "$CONTAINER" dropdb -U "$PGUSER" --if-exists "$SCRATCH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Creating scratch DB $SCRATCH…"
docker exec -i "$CONTAINER" createdb -U "$PGUSER" "$SCRATCH"

echo "Restoring…"
docker cp "$latest" "$CONTAINER:/tmp/rt.dump"
docker exec -i "$CONTAINER" pg_restore -U "$PGUSER" -d "$SCRATCH" \
  --no-owner --no-privileges /tmp/rt.dump

count="$(docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$SCRATCH" -tAc \
  "select count(*) from ${PROBE_TABLE}" 2>/dev/null | tr -d '[:space:]')"
if ! [[ "$count" =~ ^[0-9]+$ ]] || [ "$count" -lt 1 ]; then
  echo "FAIL: restored DB has no rows in ${PROBE_TABLE} (count='${count}')" >&2
  exit 1
fi

echo "OK: restore verified — ${PROBE_TABLE}=${count} rows in ${SCRATCH}"
