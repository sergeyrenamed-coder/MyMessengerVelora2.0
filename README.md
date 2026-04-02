# Velora

Velora is a Node.js messenger with personal chats, groups, channels, Socket.IO realtime, SQLite storage, WebRTC calls, themes, stickers, voice notes, and video notes.

## Stack

- Node.js + Express
- Socket.IO
- better-sqlite3
- Plain HTML/CSS/JS frontend
- SQLite file storage

## Local Run

Use `npm.cmd` on Windows PowerShell.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd start
```

Open `http://localhost:3000`.

## Useful Scripts

```powershell
npm.cmd run check
npm.cmd run dev
npm.cmd run docker:build
```

## Environment

Supported variables:

- `PORT` - HTTP port, default `3000`
- `DATA_DIR` - directory for `messenger.db` and uploads
- `DB_PATH` - optional explicit path to SQLite database
- `UPLOAD_DIR` - optional explicit path to uploaded files
- `TRUST_PROXY` - set to `true` or proxy depth when deploying behind nginx / Render / Railway

Example:

```powershell
$env:PORT=3000
$env:DATA_DIR=\"./data\"
node server.js
```

## Mobile / PWA Notes

- The frontend includes mobile-first overrides for phones.
- Safe-area insets are supported for notched devices.
- Service worker caches only static assets and no longer caches API, Socket.IO, or uploads.

## GitHub Hosting

GitHub Pages is **not suitable** for this project because Velora needs:

- a Node.js backend
- Socket.IO realtime connection
- SQLite writes
- authenticated file downloads

This repository is now prepared for GitHub-based deployment in a realistic way:

- GitHub Actions runs syntax checks on every push / pull request
- Docker image can be built and published to GHCR
- runtime paths are configurable through environment variables

### Recommended Flow

1. Push the repository to GitHub.
2. Let GitHub Actions build and verify the app.
3. Deploy the Docker image from GHCR to your server or platform.

Good targets:

- VPS with Docker + nginx
- Coolify
- Railway
- Render
- Fly.io

## Docker

Build locally:

```powershell
docker build -t velora .
```

Run:

```powershell
docker run --rm -p 3000:3000 -e DATA_DIR=/data -v ${PWD}\\data:/data velora
```

## Multi-account Testing

To open another account in a new browser tab, use:

```text
http://localhost:3000/?fresh=1
```

## Current Limits

- SQLite is fine for local use and small deployments, but not for heavy multi-instance scaling.
- WebRTC calls are peer-to-peer and not SFU-based.
- E2EE is session-oriented and not yet a full multi-device key sync model.
