# Bloxd Shooter

A blocky 3D first-person shooter that runs in the browser, built with Three.js and a Node.js backend.

## Features

- **3D blocky graphics** — Minecraft-style voxel world, all rendered in the browser with Three.js
- **3 themed maps** — Open Field, Bomb Building, Desert Base
- **3 enemy types** — Grunt, Rusher, Heavy (each with different AI, speed, and weapons)
- **1 allied soldier** — roams the map and fights enemies on his own
- **3 weapons** — Rifle, Sniper (with zoom), Grenade (with physics and blast damage)
- **Ragdoll physics** — enemies break apart and fall when killed
- **Nametags and health bars** — floating above every soldier, hidden behind walls
- **Touch controls** — playable on mobile/tablet, plus full PC mouse + keyboard support
- **Sound effects** — all synthesized in code, no audio files needed
- **Accounts and leaderboard** — register, log in, save your score, compete with others

## Tech

- **Frontend:** Three.js (loaded from CDN), plain JavaScript, no build step
- **Backend:** Node.js with zero dependencies — just the built-in `http`, `fs`, `path`, and `crypto` modules
- **Storage:** JSON file (`data.json`) — simple, no database required
- **Auth:** Passwords hashed with `scrypt`, sessions stored server-side

## How to run

1. Put `server.js` and `index.html` in the same folder
2. Run:
