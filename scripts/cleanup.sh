#!/bin/bash
set -euo pipefail
DRY_RUN=${DRY_RUN:-1}
LOG_FILE="cleanup_$(date +%Y%m%d_%H%M%S).log"
DELETED=0
SAVED_BYTES=0

log() { echo "$1" | tee -a "$LOG_FILE"; }

maybe_rm() {
  local f="$1"
  if [ ! -f "$f" ]; then return; fi
  local bytes=$(stat -c%s "$f" 2>/dev/null || echo 0)
  if [ "$DRY_RUN" = "1" ]; then
    log "[DRY_RUN] Would delete: $f ($bytes bytes)"
  else
    rm -f "$f"
    log "[DELETED] $f ($bytes bytes)"
    ((DELETED++)) || true
    SAVED_BYTES=$((SAVED_BYTES + bytes))
  fi
}

# 1. Argument artifacts in apps/master
for f in ./apps/master/--ci ./apps/master/--config ./apps/master/--passWithNoTests ./apps/master/--runInBand ./apps/master/--testPathPatterns; do
  maybe_rm "$f"
done

# 2. Redundant package-lock.json files (keep root, delete sub-packages)
for f in ./apps/gallery/package-lock.json ./apps/license-generator/package-lock.json ./apps/management/package-lock.json ./apps/master/package-lock.json ./apps/moneytrash/package-lock.json ./apps/website/package-lock.json ./packages/types/package-lock.json ./packages/ui/package-lock.json; do
  maybe_rm "$f"
done

# 3. Temp files
for f in ./_tmp_*; do
  [ -f "$f" ] && maybe_rm "$f"
done

# 4. Scan tree JSON
maybe_rm "./_scan_tree.json"

# 5. Debug archives (trace.zip in test-results)
for f in ./test-results/*/trace.zip; do
  [ -f "$f" ] && maybe_rm "$f"
done

# 6. Empty files (maxdepth 3 for safety)
while IFS= read -r f; do
  [ -f "$f" ] && maybe_rm "$f"
done < <(find . -maxdepth 3 -type f -size 0 2>/dev/null)

# 7. Archive one-off scripts
for f in ./scripts/archive/clone_om.bat ./scripts/archive/deploy_ecosystem.ps1 ./scripts/archive/deploy_finish.ps1 ./scripts/archive/sequential_build.bat ./scripts/archive/sequential_build_v2.bat ./scripts/archive/sequential_build_v3.bat ./scripts/archive/sequential_build_v4.bat ./scripts/archive/sequential_build_v5.bat; do
  maybe_rm "$f"
done

if [ "$DRY_RUN" = "1" ]; then
  log ""
  log "=== DRY RUN COMPLETE ==="
  log "Run with DRY_RUN=0 to execute deletions."
else
  log ""
  log "=== CLEANUP COMPLETE ==="
  log "Files deleted: $DELETED"
  log "Space saved: $SAVED_BYTES bytes ($(numfmt --to=iec $SAVED_BYTES 2>/dev/null || echo $SAVED_BYTES bytes))"
fi
