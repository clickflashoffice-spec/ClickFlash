#!/bin/bash
# Git History Secret Rotation Script
# WARNING: This will rewrite git history. Original history is backed up in branch 'backup-original-history-before-rotation'

set -e

echo "=== GIT HISTORY SECRET ROTATION ==="
echo ""
echo "BACKUP STATUS:"
echo "  Original history preserved in branch: backup-original-history-before-rotation"
echo ""

# Verify we're in the repo
cd /c/Users/alamo/Desktop/ClickFlash

# Check if backup branch exists
if git branch --list backup-original-history-before-rotation | grep -q backup-original-history-before-rotation; then
    echo "✓ Backup branch exists"
else
    echo "✗ Backup branch NOT found. Creating now..."
    git branch backup-original-history-before-rotation
fi

echo ""
echo "Replacements to be made:"
cat docs/audit/tools/git_filter_repo_replacements.txt | grep -v "^$" | grep -v "==>==>"

echo ""
echo "DRY RUN (analysis only - no changes):"
python -m git_filter_repo --analyze --report-dir docs/audit/tools/filter_repo_analysis 2>&1 | tail -20

echo ""
echo "To execute the actual rotation, run:"
echo "  python -m git_filter_repo --replace-text docs/audit/tools/git_filter_repo_replacements.txt --force"
echo ""
echo "After rotation, force-push to remote:"
echo "  git push origin --force --all"
echo ""
echo "NOTE: All collaborators will need to re-clone the repository after force-push."
