#!/bin/bash
# Interaktive Ersteinrichtung der lokalen CMS-Zugangsdaten (.env.local).
# macOS/Linux-Gegenstueck zu scripts/cms-setup.ps1.
# Wird von CMS-Zugangsdaten-aendern.command und CMS-Start.command aufgerufen.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
env_path="$repo_root/.env.local"

echo ""
echo "=== Einrichtung: CMS-Zugangsdaten ==="
echo ""

if [ -f "$env_path" ]; then
    read -r -p "Es existiert bereits eine .env.local. Ueberschreiben? (j/n) " overwrite
    case "$overwrite" in
        j|J) ;;
        *)
            echo "Abgebrochen. Bestehende Datei bleibt unveraendert."
            exit 0
            ;;
    esac
    echo ""
fi

read -r -p "Benutzername fuer den Login (Enter fuer 'admin'): " username
if [ -z "$username" ]; then
    username="admin"
fi

while true; do
    read -r -s -p "Neues Passwort (mind. 8 Zeichen): " pw1
    echo ""
    if [ -z "$pw1" ] || [ ${#pw1} -lt 8 ]; then
        echo "Das Passwort muss mindestens 8 Zeichen lang sein."
        continue
    fi
    read -r -s -p "Passwort wiederholen: " pw2
    echo ""
    if [ "$pw1" != "$pw2" ]; then
        echo "Die Passwoerter stimmen nicht ueberein. Bitte erneut versuchen."
        continue
    fi
    break
done

echo ""
echo "Passwort-Hash wird erzeugt..."
hash="$(cd "$repo_root" && node "scripts/cms-hash-password.mjs" "$pw1")"
if [ -z "$hash" ]; then
    echo "[FEHLER] Der Passwort-Hash konnte nicht erzeugt werden. Ist Node.js installiert?"
    exit 1
fi

session_secret="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"

echo ""
echo "--- GitHub-Anbindung (optional, aber empfohlen) ---"
echo "Damit Speicherungen automatisch als Commit ins GitHub-Repository geschrieben werden."
echo "Ohne Token werden Aenderungen NUR lokal auf diesem Rechner gespeichert."
echo "Token erstellen: https://github.com/settings/tokens (fine-grained, 'Contents: Read and write')"
echo "Der Token wird nur lokal in .env.local gespeichert (nicht Teil des Git-Repositorys) und niemals eingegeben."

github_owner="Hudnur111"
github_repo="Website---E-Motion-Rennteam-Aalen-"
github_branch="website"
github_token=""

# Prueft den Token sofort gegen die GitHub-API, statt ihn blind zu
# akzeptieren - sonst faellt ein falsch eingefuegter oder zu schwach
# berechtigter Token erst Wochen spaeter beim ersten echten Speichern auf,
# als kryptisches "(401)" ohne jeden Hinweis, was zu tun ist.
#
# /repos/{owner}/{repo} allein beweist nicht, dass der Token gueltig ist:
# bei einem OEFFENTLICHEN Repository (wie diesem) liefert GitHub dessen
# Basis-Metadaten auch ohne/mit kaputtem Token aus, da das jede:r anonym
# lesen kann. /user hat diese Luecke nicht - liefert "wer bin ich" und
# verlangt daher immer einen wirklich gueltigen Token.
test_github_token() {
    local token="$1" owner="$2" repo="$3"
    if ! command -v curl >/dev/null 2>&1; then
        echo "SKIP|curl nicht verfuegbar - Token wird ungeprueft uebernommen."
        return
    fi

    # `|| echo "000"`: under `set -e` (active for this whole script), a
    # failed curl (offline, timeout, DNS) inside a bare `var=$(cmd)`
    # assignment would otherwise abort the entire setup script instead of
    # gracefully falling back to "couldn't check, proceeding anyway".
    local user_status
    user_status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
        -H "Authorization: Bearer $token" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/user" || echo "000")"
    if [ "$user_status" = "401" ] || [ "$user_status" = "403" ]; then
        echo "FAIL|Token ist UNGUELTIG, abgelaufen oder wurde falsch eingefuegt (Status $user_status)."
        return
    fi
    if [ "$user_status" != "200" ]; then
        echo "SKIP|Token konnte nicht geprueft werden (evtl. keine Internetverbindung) - wird trotzdem uebernommen."
        return
    fi

    local repo_response repo_status
    repo_response="$(curl -s -w '\n%{http_code}' --max-time 8 \
        -H "Authorization: Bearer $token" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$owner/$repo" || echo "000")"
    repo_status="$(echo "$repo_response" | tail -n1)"
    if [ "$repo_status" = "404" ] || [ "$repo_status" = "403" ]; then
        echo "FAIL|Token ist gueltig, aber Repository '$owner/$repo' wurde nicht gefunden oder der Token hat keinen Zugriff darauf (Status $repo_status)."
        return
    fi
    if [ "$repo_status" != "200" ]; then
        echo "SKIP|Token konnte nicht vollstaendig geprueft werden - wird trotzdem uebernommen."
        return
    fi

    local body push
    body="$(echo "$repo_response" | sed '$d')"
    push="$(echo "$body" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.permissions&&j.permissions.push===false?'no':'yes')}catch{process.stdout.write('yes')}})" 2>/dev/null || echo "yes")"
    if [ "$push" = "no" ]; then
        echo "FAIL|Token ist gueltig, hat aber KEINE Schreibrechte fuer '$owner/$repo' (Berechtigung 'Contents: Read and write' fehlt)."
        return
    fi
    echo "OK|Token gueltig, Schreibzugriff auf '$owner/$repo' bestaetigt."
}

while true; do
    read -r -s -p "GitHub Personal Access Token (leer lassen zum Ueberspringen): " github_token
    echo ""
    github_token="$(echo "$github_token" | xargs || true)"
    if [ -z "$github_token" ]; then break; fi

    read -r -p "GitHub-Benutzer/Organisation (Enter fuer '$github_owner'): " owner_input
    if [ -n "$owner_input" ]; then github_owner="$owner_input"; fi

    read -r -p "Repository-Name (Enter fuer '$github_repo'): " repo_input
    if [ -n "$repo_input" ]; then github_repo="$repo_input"; fi

    read -r -p "Branch, in den committet wird (Enter fuer '$github_branch'): " branch_input
    if [ -n "$branch_input" ]; then github_branch="$branch_input"; fi

    echo "Token wird geprueft..."
    result="$(test_github_token "$github_token" "$github_owner" "$github_repo")"
    status="${result%%|*}"
    message="${result#*|}"
    echo "$message"
    if [ "$status" = "FAIL" ]; then
        read -r -p "Token erneut eingeben? (j/n, 'n' uebernimmt ihn trotzdem) " retry
        case "$retry" in
            j|J) continue ;;
        esac
    fi
    break
done

echo ""
echo "--- Online-Benutzerverwaltung (optional) ---"
echo "Damit koennen mehrere Personen eigene CMS-Zugaenge mit Rollen (Admin,"
echo "Sponsoring-Management, ...) bekommen, verschluesselt gespeichert im"
echo "privaten Repo 'Login-Benutzerverwaltung'. Ohne diese Angaben funktioniert"
echo "das CMS wie bisher (nur der oben eingerichtete Zugang, lokal)."
echo "WICHTIG: Diese vier Werte muessen VORHER einmalig im 'Login-Benutzerverwaltung'-"
echo "Projekt selbst erzeugt worden sein (siehe dessen README, 'npm run add-admin') -"
echo "hier werden nur die fertigen Werte eingetragen, nicht neu erzeugt."

credentials_token=""
credentials_owner="E-Motion-Rennteam-Aalen-e-V"
credentials_repo="Login-Benutzerverwaltung"
credentials_key=""
credentials_key_id="v1"

read -r -p "Online-Benutzerverwaltung jetzt einrichten? (j/n) " setup_credentials
case "$setup_credentials" in
    j|J)
        read -r -s -p "Fine-grained Token NUR fuer das 'Login-Benutzerverwaltung'-Repo: " credentials_token
        echo ""
        credentials_token="$(echo "$credentials_token" | xargs || true)"
        read -r -p "GitHub-Organisation (Enter fuer '$credentials_owner'): " owner_input
        if [ -n "$owner_input" ]; then credentials_owner="$owner_input"; fi
        read -r -p "Repository-Name (Enter fuer '$credentials_repo'): " repo_input
        if [ -n "$repo_input" ]; then credentials_repo="$repo_input"; fi
        read -r -s -p "Verschluesselungsschluessel (CMS_CREDENTIALS_ENCRYPTION_KEY aus dem anderen Projekt): " credentials_key
        echo ""
        credentials_key="$(echo "$credentials_key" | xargs || true)"
        read -r -p "Key-ID (Enter fuer '$credentials_key_id'): " key_id_input
        if [ -n "$key_id_input" ]; then credentials_key_id="$key_id_input"; fi

        if [ -z "$credentials_token" ] || [ -z "$credentials_key" ]; then
            echo "Token oder Schluessel fehlt - Online-Benutzerverwaltung wird NICHT aktiviert."
            credentials_token=""
            credentials_key=""
        else
            echo "Token wird geprueft..."
            result="$(test_github_token "$credentials_token" "$credentials_owner" "$credentials_repo")"
            status="${result%%|*}"
            message="${result#*|}"
            echo "$message"
            if [ "$status" = "FAIL" ]; then
                echo "Wird trotzdem uebernommen - bei falschen Werten meldet das CMS beim Login einen Fehler."
            fi
        fi
        ;;
esac

cat > "$env_path" <<EOF
CMS_ADMIN_USER=$username
CMS_ADMIN_PASSWORD_HASH=$hash
CMS_SESSION_SECRET=$session_secret
GITHUB_TOKEN=$github_token
GITHUB_OWNER=$github_owner
GITHUB_REPO=$github_repo
GITHUB_BRANCH=$github_branch
CMS_CREDENTIALS_TOKEN=$credentials_token
CMS_CREDENTIALS_OWNER=$credentials_owner
CMS_CREDENTIALS_REPO=$credentials_repo
CMS_CREDENTIALS_ENCRYPTION_KEY=$credentials_key
CMS_CREDENTIALS_KEY_ID=$credentials_key_id
EOF

echo ""
echo "Fertig! Zugangsdaten wurden gespeichert."
echo "Benutzername: $username"
if [ -z "$github_token" ]; then
    echo "Hinweis: Kein GitHub-Token gesetzt - Aenderungen werden vorerst nur lokal gespeichert."
    echo "Das kannst du jederzeit spaeter nachholen, indem du die Einrichtung erneut ausfuehrst."
fi
