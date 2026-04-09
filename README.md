# Buddagatchi

Your Claude Code `/buddy` companion, living on your desktop as a tamagotchi.

![macOS](https://img.shields.io/badge/macOS-Apple%20Silicon-black) ![Electron](https://img.shields.io/badge/Electron-33-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## What is this?

Buddagatchi reads your Claude Code buddy from `~/.claude.json` and brings it to life as a desktop pet. It sits on your screen as animated ASCII art, talks to you via the Anthropic API, and tracks tamagotchi-style stats.

### Features

- **Your buddy, on your desktop** — Reads your `/buddy` name, species, and personality from Claude Code
- **ASCII art with animation** — Faithful to the Claude Code terminal aesthetic, with animated idle frames
- **Claude-powered personality** — Click to talk, idle chatter, stat-based reactions, all in-character
- **Tamagotchi stats** — Hunger, happiness, and energy decay over time. Feed and pet your buddy to keep it alive
- **Customizable** — Change your buddy's color, add emoji hats
- **Dance mode** — Right-click and hit Dance
- **Surprises** — Explore the Advanced settings if you dare

## Install

### Homebrew (recommended)

```bash
brew tap eschnei/buddagatchi
brew install --cask buddagatchi
```

### Manual download

Download the `.dmg` from the [latest release](https://github.com/eschnei/buddagatchi/releases/latest).

> **Note:** Buddagatchi is unsigned. On first launch, right-click the app and select **Open**, or go to **System Settings > Privacy & Security > Open Anyway**.

## Setup

1. **Hatch your buddy** — Run `/buddy` in Claude Code if you haven't already
2. **Launch Buddagatchi** — Your buddy loads automatically from `~/.claude.json`
3. **Set your API key** — Right-click the pet > Settings > enter your Anthropic API key for Claude-powered speech

## How to use

| Action | How |
|--------|-----|
| Talk | Single click the pet |
| Pet (happiness +15) | Double click |
| Feed (hunger +20) | Triple click |
| Dance | Right-click > Dance |
| Settings | Right-click > Settings |
| Move | Click and drag |

## Compatibility

- macOS 12 Monterey or later
- **Apple Silicon only** (M1, M2, M3, M4)
- Intel Macs are not supported in this build
- Requires Claude Code with the `/buddy` command

If no buddy is configured, Buddagatchi uses a generic personality and nudges you to run `/buddy`.

## Build from source

```bash
git clone https://github.com/eschnei/buddagatchi.git
cd buddagatchi
npm install

# Compile the lid angle reader (requires Xcode command line tools)
cd resources
swiftc -O lid-angle-reader.swift -o lid-angle-reader
cd ..

# Run in development
npm run build && npx electron .

# Build distributable .dmg
npm run build:dist
```

## Tech stack

- Electron + Vite + React + TypeScript + Tailwind
- `@anthropic-ai/sdk` for Claude API
- `electron-store` for persistence
- Swift/IOKit for hardware sensor access
- `afplay` for audio

## License

MIT
