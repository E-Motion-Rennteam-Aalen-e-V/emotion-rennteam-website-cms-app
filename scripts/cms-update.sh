#!/bin/bash
# Prueft beim Start automatisch, ob es im GitHub-Repository eine neuere
# Version gibt, und uebernimmt sie per Fast-Forward-Merge. macOS/Linux-
# Gegenstueck zu scripts/cms-update.ps1.
# Wird von CMS-Start.command vor dem Abhaengigkeits-Check aufgerufen.
#
# Schlaegt irgendetwas fehl (kein Git, kein Internet, lokale Aenderungen,
# abweichender Verlauf), wird das einfach uebersprungen - der Start der App
# wird dadurch NIE blockiert, es laeuft dann mit der vorhandenen Version weiter.

# Marker fuer den Inhalte-Abgleich weiter unten (sync_content). Muss vor dem
# Code-Update-Check geprueft/entfernt werden - siehe dortigen Kommentar.
CONTENT_SYNC_MARKER="[cms-content-sync]"

# Ohne dies kann ein netzwerkseitig haengender (nicht sofort scheiternder)
# Verbindungsversuch git fetch/ls-remote unbegrenzt lange blockieren und
# damit den gesamten CMS-Start aufhalten. Bricht Uebertragungen ab, die
# laenger als 15s unter 1000 Bytes/s fallen.
GIT_TIMEOUT_ARGS=(-c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15)

REPO_URL="https://github.com/Hudnur111/Website---E-Motion-Rennteam-Aalen-.git"
REPO_NAME="Website---E-Motion-Rennteam-Aalen-"

if ! command -v git >/dev/null 2>&1; then
    exit 0
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

# Kein Git-Repo? Das passiert, wenn jemand ueber GitHub "Download ZIP" statt
# "git clone" verwendet hat - dabei wird kein .git-Ordner mitgeliefert, und
# ohne den funktioniert die automatische Update-Pruefung unten nie. Richtet
# deshalb einmalig ein Git-Repo ein, das mit GitHub verbunden ist. Ueberschreibt
# dabei absichtlich den kompletten Stand mit dem von GitHub (git reset --hard) -
# das ist beim allerersten Start unproblematisch (es gibt noch keine eigenen
# Aenderungen) und bringt gleichzeitig eventuell unvollstaendige/veraltete
# Dateien aus dem ZIP auf den aktuellen Stand. Nicht versionierte Dateien wie
# .env.local oder node_modules bleiben davon unberuehrt.
if ! git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Richte automatische Updates ein (einmalig)..."

    # Branch aus dem Ordnernamen ableiten - GitHub benennt ZIP-Downloads nach
    # dem Muster <repo>-<branch>. Klappt das nicht, wird der Standard-Branch
    # des Repositorys auf GitHub verwendet.
    folder_name="$(basename "$repo_root")"
    branch=""
    case "$folder_name" in
        "$REPO_NAME"-*)
            branch="${folder_name#"$REPO_NAME"-}"
            ;;
    esac

    (
        cd "$repo_root" || exit 1
        git init --quiet
        git remote add origin "$REPO_URL"

        if [ -z "$branch" ]; then
            branch="$(git "${GIT_TIMEOUT_ARGS[@]}" ls-remote --symref origin HEAD 2>/dev/null | sed -n 's#^ref: refs/heads/\(.*\)\tHEAD#\1#p')"
            branch="${branch:-website}"
        fi

        if git checkout --quiet -b "$branch" 2>/dev/null && git "${GIT_TIMEOUT_ARGS[@]}" fetch --quiet origin "$branch" 2>/dev/null; then
            git reset --quiet --hard "origin/$branch"
            echo "Fertig - kuenftige Updates werden ab jetzt automatisch erkannt."
        else
            echo "[HINWEIS] Automatische Updates konnten nicht eingerichtet werden"
            echo "(keine Internetverbindung oder Branch '$branch' nicht gefunden)."
            rm -rf "$repo_root/.git"
        fi
    )
    echo ""
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
    exit 0
fi

# Ein vorheriger Lauf dieses Skripts kann einen lokalen Inhalte-Abgleich-
# Commit hinterlassen haben (siehe sync_content ganz unten). Der ist absichtlich
# nie gepusht und wuerde jeden weiteren "git merge --ff-only" unten daran
# hindern, ueberhaupt noch ein Fast-Forward zu sein - deshalb erst wieder
# entfernen. Nur wenn HEAD genau dieser Marker-Commit ist UND seitdem nichts
# geaendert wurde: sonst koennte das eine noch ungesicherte lokale
# Bearbeitung verwerfen, die seitdem obendrauf gekommen ist.
if [ "$(git log -1 --format=%s 2>/dev/null)" = "$CONTENT_SYNC_MARKER" ] \
    && [ -z "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]; then
    git reset --quiet --hard HEAD~1 2>/dev/null || true
fi

# Inhalte, die ueber das CMS gespeichert werden, landen als Commit auf dem in
# .env.local konfigurierten GITHUB_BRANCH (Standard: main) - nicht
# zwingend auf dem Branch, von dem diese CMS-Installation selbst laeuft
# (typischerweise cms-app, ein separates Deployment). Ohne diesen Abgleich
# zeigt die lokale content/-Kopie dieser Installation zunehmend veraltete
# Inhalte, sobald von einem anderen Geraet oder einer anderen
# CMS-Installation aus gespeichert wurde. Rein lokal (nie gepusht) und nur
# als bester Versuch: schlaegt irgendetwas fehl oder gibt es eine noch
# ungesicherte lokale Bearbeitung, wird das einfach uebersprungen.
sync_content() {
    content_branch=""
    if [ -f "$repo_root/.env.local" ]; then
        content_branch="$(grep -m1 '^GITHUB_BRANCH=' "$repo_root/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '\r\n')"
    fi
    content_branch="${content_branch:-website}"

    if [ -n "$(git status --porcelain --untracked-files=no -- content 2>/dev/null)" ]; then
        return 0
    fi

    if ! git "${GIT_TIMEOUT_ARGS[@]}" fetch --quiet origin "$content_branch" >/dev/null 2>&1; then
        return 0
    fi

    if git diff --quiet HEAD "origin/$content_branch" -- content 2>/dev/null; then
        return 0
    fi

    echo "Gleiche Inhalte mit '$content_branch' ab..."
    if ! git checkout --quiet "origin/$content_branch" -- content 2>/dev/null; then
        return 0
    fi
    git add content
    if git diff --cached --quiet; then
        git reset --quiet HEAD -- content 2>/dev/null
        return 0
    fi
    # -c user.name/user.email: this may be the first commit ever made in this
    # checkout, and this is a self-hosted, no-dev-environment CMS install -
    # git identity can't be assumed to be configured. Scoped to this one
    # command only, never touches the user's own git config.
    if git -c user.name="CMS Auto-Sync" -c user.email="cms-sync@localhost" \
        commit --quiet -m "$CONTENT_SYNC_MARKER" >/dev/null 2>&1; then
        echo "Inhalte aktualisiert."
    else
        # Commit failed (e.g. disk full) - don't leave a half-applied,
        # staged-but-uncommitted content/ that would block every future run.
        git reset --quiet HEAD -- content 2>/dev/null
        git checkout --quiet HEAD -- content 2>/dev/null
    fi
    echo ""
}

echo "Suche nach Updates..."

if ! git "${GIT_TIMEOUT_ARGS[@]}" fetch --quiet origin "$branch" >/dev/null 2>&1; then
    echo "Keine Verbindung zu GitHub - Update-Pruefung uebersprungen."
    echo ""
    exit 0
fi

local_rev="$(git rev-parse HEAD 2>/dev/null)"
remote_rev="$(git rev-parse "origin/$branch" 2>/dev/null)"

if [ -z "$remote_rev" ] || [ "$local_rev" = "$remote_rev" ]; then
    echo "Du hast bereits die neueste Version."
    echo ""
else
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        echo "[HINWEIS] Es gibt lokale Aenderungen an versionierten Dateien."
        echo "Automatisches Update wird uebersprungen, um nichts zu ueberschreiben."
        echo ""
    else
        pkg_changed="$(git diff --name-only "$local_rev" "$remote_rev" -- package.json package-lock.json 2>/dev/null)"

        echo "Ein Update ist verfuegbar und wird installiert..."
        if ! git merge --ff-only "origin/$branch" >/dev/null 2>&1; then
            echo "[HINWEIS] Update konnte nicht automatisch uebernommen werden"
            echo "(lokaler Verlauf weicht vom GitHub-Verlauf ab)."
            echo ""
        else
            echo "Update installiert."

            if [ -n "$pkg_changed" ]; then
                echo ""
                echo "Abhaengigkeiten wurden aktualisiert, werden neu installiert..."
                if [ -f "package-lock.json" ]; then
                    npm ci --no-audit --no-fund
                else
                    npm install --no-audit --no-fund
                fi
            fi

            # Der Turbopack-Build-Cache in .next kann nach einem git merge
            # inkonsistent werden - Dateien aendern sich "von aussen", nicht
            # ueber den eigenen Dateibeobachter des Dev-Servers, was zu
            # haengenden oder fehlerhaften Rebuilds fuehren kann. Nach einem
            # echten Code-Update wird deshalb sauber neu gebaut.
            rm -rf "$repo_root/.next"
            echo ""
        fi
    fi
fi

sync_content

exit 0
