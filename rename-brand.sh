#!/usr/bin/env bash
set -euo pipefail

echo "Starting brand rename: 'Kedai Elvera 57' -> 'Kedai Elvera 57'"
echo "Creating backups with .bak extension for modified files."

# Find files tracked or untracked that contain the phrase (case-insensitive)
# Exclude node_modules, .git, dist, build, coverage, and android-specific files for package renaming safety
FILES=$(git grep -Il --untracked --no-color -e "Kedai Elvera 57" -e "Kedai Elvera 57" -e "kedai-elvera-57" -e "pawon" | grep -vE "node_modules/|\.git/|dist/|build/|coverage/|playwright-report/|test-results/" || true)

if [ -z "$FILES" ]; then
    echo "No candidate files found. Exiting."
    exit 0
fi

echo "Files to process:"
echo "$FILES"

for file in $FILES; do
    # skip binary-ish by extension heuristics (images, fonts, etc)
    case "$file" in
        *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.pdf|*.webp)
            echo "Skipping binary: $file"
            continue
            ;;
    esac

    cp -- "$file" "${file}.bak" || true

    perl -0777 -pe '
        s/Kedai Elvera 57/Kedai Elvera 57/g;
        s/Kedai Elvera 57/kedai elvera 57/g;
        s/Kedai Elvera 57/KEDAI ELVERA 57/g;
        s/kedai-elvera-57/kedai-elvera-57/g;
        s/kedai-elvera-57/Kedai-Elvera-57/g;
        s/kedai_elvera_57/kedai_elvera_57/g;
    ' -i "$file"

    echo "Processed: $file"
done

# Rename files whose names contain pawon or kedai-elvera-57 (tracked files), excluding android directory
git ls-files | grep -i "pawon" | grep -v "android/" || true | while IFS= read -r f; do
    newf=$(echo "$f" | sed -E 's/[Pp]awon[-_ ]?[Ss]alam/kedai-elvera-57/g; s/[Pp]awon/kedai-elvera-57/g')
    if [ "$newf" != "$f" ]; then
        mkdir -p "$(dirname "$newf")"
        git mv "$f" "$newf" || echo "git mv failed (maybe already renamed): $f"
        echo "Renamed file: $f -> $newf"
    fi
done

echo "Done. Review changes with 'git status' and 'git diff'. Backup files end with .bak."

