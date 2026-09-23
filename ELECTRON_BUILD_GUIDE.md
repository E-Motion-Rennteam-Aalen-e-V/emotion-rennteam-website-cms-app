# E-Motion CMS - Windows Installer Build Guide

This guide explains how to build and distribute the E-Motion CMS desktop application as a Windows .exe installer.

## Prerequisites

- **Windows 10/11** (for building the .exe installer)
- **Node.js 18+** (with npm)
- **Git**
- **GitHub Token** (Personal Access Token with `repo` scope) - needed for app configuration

## Building the Installer

### 1. Clone and Setup

```bash
git clone https://github.com/E-Motion-Rennteam-Aalen-e-V/emotion-rennteam-website-cms-app.git
cd emotion-rennteam-website-cms-app
npm install
```

### 2. Build for Production

```bash
npm run electron-build
```

This will:
- Build the Next.js application
- Package with Electron
- Generate Windows installers in `dist/` folder

Output files:
- **E-Motion CMS Setup 0.1.0.exe** - NSIS installer (recommended for users)
- **E-Motion CMS-0.1.0-portable.exe** - Portable standalone executable

### 3. Test Locally

**NSIS Installer:**
```bash
dist/E-Motion\ CMS\ Setup\ 0.1.0.exe
```

This launches the setup wizard with:
- Custom installation directory selection
- Desktop shortcut creation
- Start Menu integration

**Portable:**
```bash
dist/E-Motion\ CMS-0.1.0-portable.exe
```

No installation required - runs directly.

## First Run Configuration

When the app launches for the first time, it displays a **Setup Wizard** with:

1. **GitHub Token** (password field)
   - Generate at: https://github.com/settings/personal-access-tokens/new
   - Required scopes: `repo`
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **GitHub Configuration**
   - Repository Owner: `E-Motion-Rennteam-Aalen-e-V`
   - Repository Name: `emotion-rennteam-website-cms-app`
   - Branch: `main` (default)

3. **Token Validation**
   - Click "Verify Token" to test against GitHub API
   - Config saved to: `~/.emotion-cms/config.json`
   - Auto-redirects to CMS interface after setup

## Auto-Update Mechanism

The app checks for updates on startup using GitHub Releases:
- Automatically downloads new versions in background
- Applies update on next app restart
- No manual reinstallation needed

### Publishing Updates

1. Build new version (increment version in `package.json`)
2. Run `npm run electron-build` on Windows
3. Upload `dist/*.exe` files to GitHub Releases
4. Tag release with new version (e.g., `v0.2.0`)
5. Users receive update notification and auto-download

## Distribution

### GitHub Releases Method (Recommended)

1. Create Release on GitHub:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. Upload installer files to release:
   - E-Motion CMS Setup 0.1.0.exe (NSIS)
   - E-Motion CMS-0.1.0-portable.exe (Portable)

3. Users download directly from: 
   https://github.com/E-Motion-Rennteam-Aalen-e-V/emotion-rennteam-website-cms-app/releases

### Direct Distribution

- Email the `.exe` file to non-technical users
- No command-line or development knowledge required
- One-click installation with setup wizard

## Troubleshooting

### Windows Defender Warning
Modern Windows versions may warn about unsigned executables:
- Click "More info" → "Run anyway"
- No actual security risk - app is legitimate

### Port Already in Use
If Next.js server fails to start:
- Change `NEXT_PUBLIC_PORT` in `electron/main.js`
- Default: `3000`

### Token Validation Fails
- Verify GitHub token has `repo` scope
- Check internet connection
- Token may have expired - generate new one at https://github.com/settings/personal-access-tokens/new

### Config File Location
User configuration stored at:
- Windows: `C:\Users\<Username>\.emotion-cms\config.json`
- Contains: GitHub token, owner, repo, branch

## Development

### Local Testing (Linux/Mac/Windows)

```bash
npm run electron-dev
```

Runs concurrent:
- Next.js dev server (localhost:3000)
- Electron app (displays locally)

### ESLint Configuration
Electron files use CommonJS (not ESM):
- Ignored by ESLint in `eslint.config.mjs`
- Allows require() in `electron/*.js` files

## Architecture

```
electron/
├── main.js              # Electron main process, IPC handlers
├── preload.js           # Secure IPC bridge
└── setup-wizard.html    # First-run configuration UI

Electron Flow:
1. Electron main process starts
2. Checks ~/.emotion-cms/config.json
3. If missing → Shows setup-wizard.html
4. If exists → Spawns Next.js server as child process
5. Loads localhost:3000 into BrowserWindow
6. Checks for updates via electron-updater
```

## Security

- **Context Isolation**: Renderer process cannot access Node.js APIs
- **Preload Script**: Secure IPC bridge using contextBridge
- **Token Storage**: Stored locally in user's home directory
- **GitHub API**: Token validated against GitHub API with TLS

## Files Modified

- `electron/main.js` - Electron main process
- `electron/preload.js` - Secure IPC bridge  
- `electron/setup-wizard.html` - Setup UI
- `package.json` - Added Electron scripts & build config
- `eslint.config.mjs` - Ignore electron/ for ESLint

---

**Status**: Electron app and installer build system working. Ready for Windows distribution.
