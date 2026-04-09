# Desktop Buddy — PRD & Build Spec

A desktop tamagotchi-style companion built with Electron that wraps a Claude Code "buddy" personality, lives on your desktop as a transparent always-on-top sprite, and farts when you close your MacBook lid.

---

## 1. Product Vision

A persistent, low-key desktop creature that:
- Sits on the user's desktop in a transparent frameless window
- Has a personality powered by Claude (via the Anthropic API or a local `claude` CLI subprocess)
- Reacts to what the user is doing (idle, coding, away)
- Maintains tamagotchi-style stats (hunger, happiness, energy) that decay over time
- **Farts audibly when the MacBook lid is closed.** This is a load-bearing feature.

Target platform: **macOS only** (Apple Silicon + Intel). No Windows/Linux support in v1.

---

## 2. Core Features

### 2.1 The Pet Window
- Electron `BrowserWindow` with:
  - `transparent: true`
  - `frame: false`
  - `alwaysOnTop: true` (level: `floating`)
  - `hasShadow: false`
  - `skipTaskbar: true`
  - `resizable: false`
  - Size: ~200x200px, draggable by clicking the sprite
- Mouse passthrough everywhere except the sprite itself, so the pet doesn't block clicks on whatever's underneath it
- Persists its window position across launches
- Right-click on sprite opens a context menu: Feed, Pet, Talk, Settings, Quit

### 2.2 Pet State Machine
Stats stored in `app.getPath('userData')/pet-state.json`:
- `hunger` (0–100, decays ~1 point/15min)
- `happiness` (0–100, decays ~1 point/30min)
- `energy` (0–100, decays during user activity, recovers when user is idle/away)
- `mood` (derived: `happy` | `neutral` | `sad` | `hungry` | `sleepy`)
- `lastFed`, `lastPet`, `lastInteraction` timestamps
- `birthday` timestamp

State ticks every 60 seconds. Sprite animation reflects current mood.

### 2.3 Sprites & Animation
- Use simple PNG sprite sheets or CSS-animated SVG for v1 — keep it cheap
- States needed: `idle`, `happy`, `sad`, `eating`, `sleeping`, `farting`
- Placeholder art is fine; structure the code so swapping in better sprites later is trivial

### 2.4 Claude Buddy Integration
The pet "talks" via Claude. Two implementation paths — pick one in v1, leave the other as a stretch:

**Path A (default for v1): Anthropic API direct**
- Read API key from a config file or env var (`ANTHROPIC_API_KEY`)
- Use `claude-sonnet-4-6` (model string: `claude-sonnet-4-6`)
- System prompt gives the pet a defined personality + injects current stats so the pet's dialogue reflects how it's feeling
- Speech bubble appears above the sprite when the pet "says" something
- Triggers for speaking: user clicks pet, stat crosses a threshold, every ~20min idle chatter, on lid open ("welcome back!")

**Path B (stretch): Spawn `claude` CLI as subprocess**
- Spawn `claude` from main process, pipe stdio
- Pet's speech reflects whatever Claude is currently thinking about in your dev session
- Out of scope for v1 unless trivial

### 2.5 The Fart Feature (load-bearing)
**Goal:** When the MacBook lid closes, an audible fart plays.

**Critical constraint:** Electron's `powerMonitor` `suspend` event fires *as* the system suspends, and audio may get cut off. We need to play the sound before the OS latches sleep.

**Implementation:** A separate launchd LaunchAgent runs independently of the Electron app. This agent watches for the `com.apple.system.powermanagement.lidclose` Darwin notification using `notifyutil -w` and runs `afplay /path/to/fart.wav` when fired. This decouples the fart from Electron's lifecycle so it works reliably even when Electron is suspended.

**Components:**
- `fart-daemon.sh` — shell script that loops on `notifyutil -w com.apple.system.powermanagement.lidclose` and plays the sound
- `com.ericschneider.desktopbuddy.fart.plist` — LaunchAgent plist installed to `~/Library/LaunchAgents/`
- Installer step in Electron app: on first launch, copy the plist + script into place and `launchctl load` it
- Uninstaller in Settings menu
- A bundled `fart.wav` (use a CC0 sound for the repo, leave the path swappable so the user can replace it)

**Fallback:** Also wire `powerMonitor.on('suspend', ...)` in Electron to play the fart as a belt-and-suspenders measure. If the daemon fails, Electron tries.

**Lid-open reaction:** On `powerMonitor.on('resume', ...)`, the pet wakes up, plays a `happy` animation, and says hello via Claude.

### 2.6 Settings
Minimal settings panel:
- Anthropic API key input
- Fart volume slider
- Fart enabled/disabled toggle (for meetings)
- "Mute fart for next 2 hours" quick toggle
- Reset pet button
- Uninstall fart daemon button

---

## 3. Tech Stack

- **Electron** (latest stable)
- **TypeScript** throughout
- **Vite** for renderer bundling (`electron-vite` is fine)
- **React** for the renderer (overkill for one sprite but makes the speech bubble + settings easy)
- **Tailwind** for styling (transparent backgrounds, easy speech bubble)
- **@anthropic-ai/sdk** for Claude calls
- **electron-store** for persisted state
- Native macOS calls via shell-out (`afplay`, `notifyutil`, `launchctl`) — no native addons needed for v1

---

## 4. Project Structure

```
desktop-buddy/
├── SPEC.md                          # this file
├── package.json
├── electron.vite.config.ts
├── src/
│   ├── main/
│   │   ├── index.ts                 # Electron entry, window creation
│   │   ├── pet-window.ts            # transparent window setup
│   │   ├── pet-state.ts             # state machine + persistence
│   │   ├── claude-bridge.ts         # Anthropic API wrapper
│   │   ├── power-monitor.ts         # suspend/resume hooks
│   │   ├── fart-installer.ts        # launchd install/uninstall
│   │   └── ipc.ts                   # IPC channel definitions
│   ├── preload/
│   │   └── index.ts
│   └── renderer/
│       ├── index.html
│       ├── App.tsx
│       ├── components/
│       │   ├── Pet.tsx              # the sprite
│       │   ├── SpeechBubble.tsx
│       │   └── Settings.tsx
│       └── assets/
│           ├── sprites/             # placeholder PNGs
│           └── fart.wav
├── resources/
│   ├── fart-daemon.sh
│   └── com.ericschneider.desktopbuddy.fart.plist
└── README.md
```

---

## 5. Build Order (do these in sequence)

1. **Scaffold** the Electron + Vite + React + TS project
2. **Transparent pet window** with a placeholder colored circle as the sprite, draggable, always-on-top, mouse passthrough working
3. **Pet state machine** with persistence + a debug overlay showing current stats
4. **Power monitor hooks** — log suspend/resume to a file, confirm they fire on lid close/open
5. **Fart daemon** — shell script + launchd plist + installer. Test independently of Electron by closing the lid.
6. **Claude bridge** — system prompt, speech bubble, click-to-talk
7. **Real sprite art + animations** for each mood
8. **Settings panel**
9. **Polish:** app icon, dock hiding, autostart on login, packaging with `electron-builder`

Get each step working end-to-end before moving on. Don't build the whole thing and then debug.

---

## 6. Open Questions / Decisions to Make Later

- App icon and pet design (placeholder for now)
- Whether to log Claude interactions for the user to revisit
- Whether the pet should react to specific apps being focused (e.g. get excited when VS Code is frontmost) — stretch goal
- Multi-pet support — explicitly out of scope

---

## 7. Definition of Done for v1

- [ ] App launches, pet appears on desktop, transparent and always-on-top
- [ ] Pet stats decay and persist across launches
- [ ] Clicking pet triggers a Claude-generated message in a speech bubble
- [ ] Closing the lid plays a fart sound reliably (tested 10 times in a row)
- [ ] Opening the lid wakes the pet and triggers a hello
- [ ] Settings panel works, fart can be muted
- [ ] App can be installed, autostarts on login, can be cleanly uninstalled

---

# Claude Code Kickoff Prompt

Paste this into Claude Code in an empty directory to start the project:

> I'm building a macOS desktop tamagotchi app called **Desktop Buddy**. It's an Electron app that puts a transparent always-on-top pet on my desktop, gives it a personality powered by the Anthropic API, and — critically — plays a fart sound when I close my MacBook lid via a launchd daemon that runs independently of the Electron process.
>
> The full PRD is in `SPEC.md` in this directory. Please read it first before doing anything else.
>
> Your job: build this in the order specified in the "Build Order" section of the spec. **Do not skip ahead.** Get each step working end-to-end and let me verify before moving to the next one.
>
> Start with **Step 1: Scaffold**. Set up Electron + Vite + React + TypeScript + Tailwind in this directory. Use `electron-vite` for the build tooling. Use the project structure from section 4 of the spec. When the scaffold is done and `npm run dev` opens a window, stop and tell me to verify before you move on to Step 2.
>
> A few rules:
> - macOS only. Don't add Windows/Linux conditionals.
> - TypeScript strict mode on.
> - Keep dependencies minimal — if you can do it with the standard library or a shell-out, prefer that over a new package.
> - For the fart daemon (Step 5), shell out to `notifyutil` and `afplay`. Don't reach for native node addons.
> - When you hit a decision point not covered by the spec, ask me before guessing.
> - Use a CC0-licensed fart sound for `fart.wav` — note in a TODO that I should swap it for a better one.
>
> Ready? Read `SPEC.md`, confirm you understand the goal, and then start on Step 1.