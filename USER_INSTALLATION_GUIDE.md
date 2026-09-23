# E-Motion CMS - Installation Guide for Windows Users

**No technical knowledge required. Just download and click!**

## Download

1. Go to: https://github.com/E-Motion-Rennteam-Aalen-e-V/emotion-rennteam-website-cms-app/releases
2. Download: **E-Motion CMS Setup 0.1.0.exe**
3. Save to your computer

## Installation

1. Double-click **E-Motion CMS Setup 0.1.0.exe**
2. Click through the setup wizard:
   - Select installation location (default is fine)
   - Agree to installation
3. After installation completes:
   - ✓ Desktop shortcut created
   - ✓ Start Menu shortcut created
4. Click **Finish**

## First Time Setup

When you launch E-Motion CMS for the first time:

1. **Setup Wizard** appears with a form

2. **GitHub Token** field:
   - Go to: https://github.com/settings/personal-access-tokens/new
   - Create a new token:
     - Name: "E-Motion CMS"
     - Check only: ✓ `repo`
     - Click "Generate token"
   - Copy the token (looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - Paste into the "GitHub Token" field in setup wizard

3. **Repository Details** (usually pre-filled):
   - Owner: `E-Motion-Rennteam-Aalen-e-V`
   - Repository: `emotion-rennteam-website-cms-app`
   - Branch: `main`

4. Click **Verify Token** (checks connection to GitHub)

5. Click **Start CMS** → Dashboard loads

## Using the App

- **Desktop shortcut** - Quick launch
- **Start Menu** - Find E-Motion CMS in menu
- **Auto-Update** - App checks for updates on startup, downloads automatically

## Automatic Updates

The app automatically checks for new versions when you start it:
- Updates download in background
- Applied next time you restart the app
- **No manual installation needed** - updates happen automatically

## Troubleshooting

### "Windows protected your PC"
- This is a security warning for unsigned apps
- Click "More info" → "Run anyway"
- Completely safe - this is the legitimate E-Motion CMS app

### "GitHub Token Failed"
- Token may have incorrect permissions
- Generate new token at: https://github.com/settings/personal-access-tokens/new
- Make sure ✓ `repo` is checked

### "Can't connect to internet"
- Check your WiFi/internet connection
- Token verification requires internet access

### "App won't start"
- Try restarting your computer
- Reinstall using setup wizard

## Uninstall

1. Go to **Settings** → **Apps** → **Apps & features**
2. Find "E-Motion CMS"
3. Click and select **Uninstall**
4. Follow prompts

Or use: **Control Panel** → **Programs** → **Programs and Features** → **E-Motion CMS** → **Uninstall**

## Support

For issues:
1. Check troubleshooting above
2. Contact: E-Motion Rennteam Aalen
3. Or open issue: https://github.com/E-Motion-Rennteam-Aalen-e-V/emotion-rennteam-website-cms-app/issues

---

**That's it! The app is ready to use with automatic updates.**
