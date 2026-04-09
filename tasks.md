# Desktop Buddy -- Development Task List

Generated from `spec.md` on 2026-04-08. Tasks follow the build order from Section 5 of the spec. Complete each step end-to-end before moving to the next.

---

## Specification Summary

**What it is**: A macOS desktop tamagotchi that lives as a transparent always-on-top Electron window, has a Claude-powered personality, maintains decaying stats, and farts when the MacBook lid closes.

**Tech stack**: Electron + Vite (`electron-vite`) + React + TypeScript (strict) + Tailwind + `@anthropic-ai/sdk` + `electron-store`. macOS only. No native addons -- shell out to `afplay`, `notifyutil`, `launchctl`, and `lidanglesensor`.

**Definition of Done (from spec Section 7)**:
- App launches, pet appears on desktop, transparent and always-on-top
- Pet stats decay and persist across launches
- Clicking pet triggers a Claude-generated message in a speech bubble
- Closing the lid plays a fart sound reliably (tested 10 times in a row)
- Opening the lid wakes the pet and triggers a hello
- Settings panel works, fart can be muted
- App can be installed, autostarts on login, can be cleanly uninstalled

---

## Step 1: Scaffold

### [ ] 1.1 -- Initialize the Electron + Vite + React + TypeScript project

**Description**: Use `electron-vite` (or `create electron-vite`) to scaffold a new project in this directory. Configure TypeScript strict mode. Ensure the project structure matches Section 4 of the spec.

**Acceptance criteria**:
- `package.json` exists with `electron`, `vite`, `react`, `react-dom`, `typescript` as dependencies
- `electron.vite.config.ts` exists and is configured for main/preload/renderer
- `tsconfig.json` has `"strict": true`
- Directory structure matches spec Section 4: `src/main/`, `src/preload/`, `src/renderer/`, `resources/`
- Running `npm run dev` opens an Electron window (content does not matter yet)

**Files to create**:
- `package.json`
- `electron.vite.config.ts`
- `tsconfig.json` (and any sub-tsconfigs for main/preload/renderer)
- `src/main/index.ts` (minimal -- just opens a BrowserWindow)
- `src/preload/index.ts` (empty contextBridge for now)
- `src/renderer/index.html`
- `src/renderer/App.tsx` (renders "Desktop Buddy" text)

### [ ] 1.2 -- Install and configure Tailwind CSS

**Description**: Add Tailwind CSS to the renderer build pipeline.

**Acceptance criteria**:
- Tailwind is installed and configured in the Vite renderer build
- A test utility class (e.g., `bg-red-500`) applies correctly in the rendered window
- `tailwind.config.js` (or `.ts`) scans `src/renderer/**/*.{tsx,ts,html}`

**Files to create/edit**:
- `tailwind.config.js`
- `src/renderer/index.css` (Tailwind directives)

### [ ] 1.3 -- Create placeholder files for all planned modules

**Description**: Create empty or stub files for every module listed in the spec's project structure so the codebase shape is visible from day one.

**Acceptance criteria**:
- All files from spec Section 4 exist (can be empty stubs with a single `// TODO` comment)
- No import errors when running the app (stubs should not be imported yet)

**Files to create**:
- `src/main/pet-window.ts`
- `src/main/pet-state.ts`
- `src/main/claude-bridge.ts`
- `src/main/power-monitor.ts`
- `src/main/fart-installer.ts`
- `src/main/ipc.ts`
- `src/renderer/components/Pet.tsx`
- `src/renderer/components/SpeechBubble.tsx`
- `src/renderer/components/Settings.tsx`
- `src/renderer/assets/sprites/` (empty directory, add a `.gitkeep`)
- `resources/fart-daemon.sh`
- `resources/com.ericschneider.desktopbuddy.fart.plist`

### [ ] 1.4 -- Install runtime dependencies

**Description**: Install the npm packages the spec calls out that are not part of the scaffold.

**Acceptance criteria**:
- `@anthropic-ai/sdk` is in `dependencies`
- `electron-store` is in `dependencies`
- App still launches cleanly with `npm run dev`

---

## Step 2: Transparent Pet Window

### [ ] 2.1 -- Create the transparent frameless BrowserWindow

**Description**: Implement `src/main/pet-window.ts` as a function that creates and returns a BrowserWindow with the exact options from spec Section 2.1.

**Acceptance criteria**:
- Window options: `transparent: true`, `frame: false`, `alwaysOnTop: true` (level `floating`), `hasShadow: false`, `skipTaskbar: true`, `resizable: false`
- Window size: 200x200
- Window is transparent -- the desktop is visible behind it
- `src/main/index.ts` imports and uses this function instead of creating the window inline

**Files to edit**:
- `src/main/pet-window.ts` (implement)
- `src/main/index.ts` (use `pet-window.ts`)

### [ ] 2.2 -- Render a placeholder sprite (colored circle)

**Description**: In `src/renderer/components/Pet.tsx`, render a simple colored circle (CSS `border-radius: 50%`) as the placeholder pet sprite. The rest of the window must be fully transparent.

**Acceptance criteria**:
- A ~120px colored circle renders in the center of the 200x200 window
- Everything outside the circle is transparent (you can see the desktop)
- The `<html>` and `<body>` elements have `background: transparent`

**Files to edit**:
- `src/renderer/components/Pet.tsx` (implement)
- `src/renderer/App.tsx` (render `<Pet />`)
- `src/renderer/index.html` (ensure transparent background styles)

### [ ] 2.3 -- Make the sprite draggable

**Description**: Clicking and dragging the sprite should move the entire Electron window. Use Electron's `-webkit-app-region: drag` on the sprite element.

**Acceptance criteria**:
- Clicking on the circle and dragging moves the window
- Clicking outside the circle does not initiate a drag
- The window can be dragged anywhere on screen

**Files to edit**:
- `src/renderer/components/Pet.tsx` (add drag region CSS)

### [ ] 2.4 -- Implement mouse click-through on transparent areas

**Description**: Configure the window so that clicks on transparent areas pass through to whatever is underneath. Use `win.setIgnoreMouseEvents(true, { forward: true })` combined with renderer-side mouse tracking to toggle ignore on/off as the cursor enters/leaves the sprite.

**Acceptance criteria**:
- Clicking on the desktop through the transparent area of the window works (you can click icons, other windows, etc.)
- Clicking on the sprite itself registers (does not pass through)
- Dragging the sprite still works

**Implementation notes**: The renderer needs to send IPC messages (`mouse-enter-sprite` / `mouse-leave-sprite`) to the main process to toggle `setIgnoreMouseEvents`. This requires the preload script to expose these IPC calls.

**Files to edit**:
- `src/main/pet-window.ts` (add `setIgnoreMouseEvents` logic)
- `src/main/ipc.ts` (define channels)
- `src/preload/index.ts` (expose IPC calls)
- `src/renderer/components/Pet.tsx` (add mouse enter/leave handlers)

### [ ] 2.5 -- Persist window position across launches

**Description**: Save the window's x/y position to `electron-store` on move events. Restore it on launch.

**Acceptance criteria**:
- Drag the window to a new position, quit, relaunch -- window appears at the saved position
- If no saved position exists (first launch), default to bottom-right of the primary display

**Files to edit**:
- `src/main/pet-window.ts` (save/restore position using `electron-store`)

### [ ] 2.6 -- Right-click context menu

**Description**: Right-clicking the sprite opens a native context menu with the items from spec Section 2.1: Feed, Pet, Talk, Settings, Quit.

**Acceptance criteria**:
- Right-clicking the sprite shows a native Electron `Menu` with: Feed, Pet, Talk, separator, Settings, separator, Quit
- "Quit" calls `app.quit()`
- Other items are stubs for now (log to console)
- Right-clicking does NOT drag the window

**Files to edit**:
- `src/main/pet-window.ts` or `src/main/ipc.ts` (handle context menu IPC)
- `src/preload/index.ts` (expose context menu trigger)
- `src/renderer/components/Pet.tsx` (send IPC on right-click, prevent default)

---

## Step 3: Pet State Machine

### [ ] 3.1 -- Define the PetState type and default values

**Description**: In `src/main/pet-state.ts`, define the TypeScript interface for the pet state matching spec Section 2.2. Define default initial values.

**Acceptance criteria**:
- `PetState` interface with: `hunger`, `happiness`, `energy` (all 0-100), `mood` (union type of `'happy' | 'neutral' | 'sad' | 'hungry' | 'sleepy'`), `lastFed`, `lastPet`, `lastInteraction` (ISO timestamp strings), `birthday` (ISO timestamp string)
- `DEFAULT_PET_STATE` constant with sensible starting values (hunger: 80, happiness: 80, energy: 100, mood: 'happy', birthday: now)
- Export both

**Files to edit**:
- `src/main/pet-state.ts`

### [ ] 3.2 -- Implement state persistence with electron-store

**Description**: Use `electron-store` to load pet state on startup and save it whenever it changes. State file goes to `app.getPath('userData')/pet-state.json` (this is the default location for `electron-store`).

**Acceptance criteria**:
- On first launch, state is initialized from `DEFAULT_PET_STATE`
- State survives app restart
- A `savePetState(state: PetState)` and `loadPetState(): PetState` function are exported

**Files to edit**:
- `src/main/pet-state.ts`

### [ ] 3.3 -- Implement stat decay tick

**Description**: Create a 60-second interval timer that decays stats according to spec Section 2.2: hunger decays ~1 point per 15 minutes (so ~0.067/tick), happiness ~1 per 30 minutes (~0.033/tick), energy decays during user activity.

**Acceptance criteria**:
- Stats decay over time when the app is running
- `mood` is recalculated after each tick based on current stats (e.g., hunger < 30 = 'hungry', energy < 20 = 'sleepy', happiness < 30 = 'sad', etc.)
- Decay does not push stats below 0
- State is saved after each tick

**Files to edit**:
- `src/main/pet-state.ts` (add tick logic, mood derivation)
- `src/main/index.ts` (start the tick interval)

### [ ] 3.4 -- Implement Feed/Pet actions

**Description**: Wire the "Feed" and "Pet" context menu items to modify pet state. Feeding increases hunger (to a max of 100). Petting increases happiness.

**Acceptance criteria**:
- "Feed" adds ~20 to hunger (capped at 100), sets `lastFed` to now, triggers `eating` mood briefly
- "Pet" adds ~15 to happiness (capped at 100), sets `lastPet` to now, triggers `happy` mood briefly
- State is saved after each action

**Files to edit**:
- `src/main/pet-state.ts` (add `feedPet()`, `petPet()` functions)
- `src/main/ipc.ts` (wire context menu actions to state functions)

### [ ] 3.5 -- Debug overlay showing current stats

**Description**: Add a debug overlay to the renderer that shows current pet stats in real-time. This overlay should be toggleable (e.g., via a keyboard shortcut or a "Debug" item in the context menu).

**Acceptance criteria**:
- Overlay displays: hunger, happiness, energy, mood, lastFed, lastPet
- Stats update in real-time (every tick)
- Overlay can be shown/hidden
- Overlay does not interfere with sprite drag or click-through

**Implementation notes**: Main process sends state updates to renderer via IPC on each tick.

**Files to edit**:
- `src/main/ipc.ts` (add state-update channel)
- `src/preload/index.ts` (expose state listener)
- `src/renderer/App.tsx` or new `src/renderer/components/DebugOverlay.tsx`
- `src/main/pet-window.ts` (add Debug to context menu)

---

## Step 4: Power Monitor Hooks

### [ ] 4.1 -- Implement suspend/resume event listeners

**Description**: In `src/main/power-monitor.ts`, use Electron's `powerMonitor` module to listen for `suspend` and `resume` events.

**Acceptance criteria**:
- On `suspend`: log to console with timestamp, attempt to play fart sound via Electron (belt-and-suspenders fallback)
- On `resume`: log to console with timestamp, trigger pet wake-up
- Events are wired up after `app.whenReady()`
- Logging output is visible in the Electron main process console

**Files to edit**:
- `src/main/power-monitor.ts` (implement)
- `src/main/index.ts` (initialize power monitor after app ready)

### [ ] 4.2 -- Wire resume to pet state

**Description**: On resume, update the pet's energy (it should recover during sleep), set mood to `happy`, and queue a "welcome back" speech bubble trigger (the speech bubble itself comes in Step 6, but set up the hook now).

**Acceptance criteria**:
- On resume, energy gets a boost (e.g., +30, capped at 100)
- Mood is set to `happy`
- A flag or event is set that Step 6 will consume to trigger a Claude "welcome back" message
- Pet state is saved

**Files to edit**:
- `src/main/power-monitor.ts` (call into pet-state on resume)
- `src/main/pet-state.ts` (add `wakeUp()` function)

### [ ] 4.3 -- Wire suspend to play fart sound via Electron (fallback)

**Description**: On the `suspend` event, immediately shell out to `afplay` to play `fart.wav`. This is the belt-and-suspenders fallback in case the launchd daemon is not installed.

**Acceptance criteria**:
- On suspend, `afplay /path/to/fart.wav` is spawned (non-blocking, fire-and-forget)
- The path to `fart.wav` resolves correctly whether in dev mode or packaged
- If fart is muted in settings, this is a no-op

**Implementation note**: Audio may get cut off by the OS -- this is expected. The launchd daemon in Step 5 is the reliable path.

**Files to edit**:
- `src/main/power-monitor.ts`
- `src/renderer/assets/fart.wav` (add a placeholder WAV file -- use any short CC0 sound effect, or generate a sine wave burst as a temp placeholder)

---

## Step 5: Fart Daemon (Lid Close Detection)

This step uses three approaches in priority order:
1. **LidAngleSensor** (Swift CLI via Homebrew) -- primary, reads lid angle in real-time
2. **notifyutil -w launchd daemon** -- fallback for M1/M2 Macs where LidAngleSensor does not work
3. **Electron powerMonitor suspend** -- belt-and-suspenders, already wired in Step 4

### [ ] 5.1 -- Write the LidAngleSensor-based fart script

**Description**: Create `resources/fart-daemon-lid-angle.sh`. This script runs in a loop, shells out to `lidanglesensor` (installed via `brew install lidanglesensor`), reads the lid angle, and plays `fart.wav` when the angle drops below a threshold (e.g., < 20 degrees). The script should debounce so it does not play the sound repeatedly while the lid is closing.

**Acceptance criteria**:
- Script checks if `lidanglesensor` binary exists; if not, exits with a clear error message
- Script polls lid angle at a reasonable interval (e.g., every 0.5 seconds)
- When angle drops below threshold (configurable, default 20 degrees), plays fart.wav via `afplay`
- Debounce: after playing once, does not play again until angle goes back above threshold (lid reopened)
- Script reads the fart.wav path from its first argument (or a default path)
- Script respects a "mute file" -- if `~/.desktop-buddy-fart-mute` exists, skip playing
- Script logs to `~/Library/Logs/desktop-buddy-fart.log`

**Files to create**:
- `resources/fart-daemon-lid-angle.sh`

### [ ] 5.2 -- Write the notifyutil-based fart script (fallback)

**Description**: Create `resources/fart-daemon.sh` as described in spec Section 2.5. This script loops on `notifyutil -w com.apple.system.powermanagement.lidclose` and plays `fart.wav` on each event.

**Acceptance criteria**:
- Script loops indefinitely: `while true; do notifyutil -w ...; afplay ...; done`
- Script reads the fart.wav path from its first argument or a default
- Script respects the same `~/.desktop-buddy-fart-mute` mute file as the lid-angle script
- Script logs to `~/Library/Logs/desktop-buddy-fart.log`
- Script is executable (`chmod +x`)

**Files to create**:
- `resources/fart-daemon.sh`

### [ ] 5.3 -- Write the launchd plist for the fart daemon

**Description**: Create the LaunchAgent plist at `resources/com.ericschneider.desktopbuddy.fart.plist`. This plist should launch the appropriate daemon script and keep it alive.

**Acceptance criteria**:
- Plist label: `com.ericschneider.desktopbuddy.fart`
- `KeepAlive: true` so launchd restarts the script if it crashes
- `ProgramArguments` points to the installed script location (e.g., `~/.desktop-buddy/fart-daemon.sh`)
- `StandardOutPath` and `StandardErrorPath` point to `~/Library/Logs/desktop-buddy-fart.log`
- `RunAtLoad: true`

**Files to create**:
- `resources/com.ericschneider.desktopbuddy.fart.plist`

### [ ] 5.4 -- Implement the fart daemon installer in Electron

**Description**: In `src/main/fart-installer.ts`, implement functions to install and uninstall the fart daemon. The installer should detect which approach to use (LidAngleSensor vs. notifyutil) and install the appropriate script.

**Acceptance criteria**:
- `installFartDaemon()`:
  1. Creates `~/.desktop-buddy/` directory
  2. Checks if `lidanglesensor` is available in PATH (via `which lidanglesensor`)
  3. If available: copies `fart-daemon-lid-angle.sh` to `~/.desktop-buddy/fart-daemon.sh`
  4. If not available: copies `fart-daemon.sh` (notifyutil version) to `~/.desktop-buddy/fart-daemon.sh`
  5. Copies `fart.wav` to `~/.desktop-buddy/fart.wav`
  6. Makes the script executable
  7. Writes the plist to `~/Library/LaunchAgents/com.ericschneider.desktopbuddy.fart.plist` (with correct paths substituted)
  8. Runs `launchctl load ~/Library/LaunchAgents/com.ericschneider.desktopbuddy.fart.plist`
  9. Returns success/failure with a message indicating which detection method was installed
- `uninstallFartDaemon()`:
  1. Runs `launchctl unload` on the plist
  2. Removes the plist from `~/Library/LaunchAgents/`
  3. Removes `~/.desktop-buddy/` directory
- `isFartDaemonInstalled(): boolean`
- `getInstalledDetectionMethod(): 'lid-angle' | 'notifyutil' | 'none'`
- All file operations use absolute paths

**Files to edit**:
- `src/main/fart-installer.ts`

### [ ] 5.5 -- Auto-install daemon on first launch

**Description**: On app startup, check if the fart daemon is installed. If not, install it automatically. Show a notification to the user about which detection method was selected.

**Acceptance criteria**:
- On first launch, daemon is installed without user intervention
- User sees a native notification: "Fart daemon installed (using LidAngleSensor)" or "Fart daemon installed (using lid-close notification)"
- If installation fails, log the error and continue (the Electron `suspend` fallback from Step 4 still works)
- On subsequent launches, skip installation if daemon is already loaded

**Files to edit**:
- `src/main/index.ts` (add first-launch check)
- `src/main/fart-installer.ts` (if needed)

### [ ] 5.6 -- Implement the mute file mechanism

**Description**: The "mute fart" feature works by creating/removing a mute file that the daemon scripts check. Implement the mute/unmute functions that will be called from Settings (Step 8) and the Electron suspend fallback.

**Acceptance criteria**:
- `muteFart()`: creates `~/.desktop-buddy-fart-mute` file
- `unmuteFart()`: removes the file
- `muteForDuration(ms: number)`: creates the file, sets a timeout to remove it
- `isMuted(): boolean`: checks if the file exists
- The Electron suspend fallback (Step 4.3) checks `isMuted()` before playing
- Both daemon scripts (5.1 and 5.2) check for this file

**Files to edit**:
- `src/main/fart-installer.ts` (add mute functions)
- `src/main/power-monitor.ts` (check mute before playing)

### [ ] 5.7 -- Manual testing of fart daemon

**Description**: This is a testing task, not a code task. Verify the fart plays reliably on lid close.

**Acceptance criteria**:
- Close the lid 10 times. Fart plays every time.
- Mute the fart, close the lid. No sound.
- Unmute, close the lid. Sound plays.
- Kill the Electron app, close the lid. Daemon still plays the fart independently.
- Uninstall the daemon, close the lid. Only the Electron fallback fires (if app is running).
- Check `~/Library/Logs/desktop-buddy-fart.log` for clean log output.

---

## Step 6: Claude Bridge

### [ ] 6.1 -- Implement the Anthropic API wrapper

**Description**: In `src/main/claude-bridge.ts`, create a wrapper around `@anthropic-ai/sdk` that sends messages with the pet's personality system prompt.

**Acceptance criteria**:
- `ClaudeBridge` class or module with:
  - Constructor takes API key (reads from `electron-store` config)
  - `chat(userMessage: string, petState: PetState): Promise<string>` method
  - System prompt defines the pet's personality and injects current stats so dialogue reflects how the pet feels (per spec Section 2.4)
  - Uses model `claude-sonnet-4-6` (model string: `claude-sonnet-4-6`)
  - Responses are short (1-2 sentences) -- enforce via system prompt instruction
- Graceful error handling: if API key is missing or invalid, return a fallback message like "* yawns *"

**Files to edit**:
- `src/main/claude-bridge.ts`

### [ ] 6.2 -- Implement the speech bubble component

**Description**: Create the `SpeechBubble.tsx` component that appears above the pet sprite to show Claude's messages.

**Acceptance criteria**:
- Speech bubble appears above the sprite with a tail/pointer
- Text renders with a typewriter animation (optional, can be simple fade-in)
- Bubble auto-dismisses after ~8 seconds
- Bubble has a transparent-friendly style (works on any desktop background)
- Bubble does not block dragging the sprite
- Bubble is positioned relative to the pet, inside the 200x200 window (or the window resizes temporarily to accommodate it)

**Implementation note**: The window may need to temporarily grow taller to show the bubble above the sprite. Alternatively, create a second small BrowserWindow anchored above the pet window. Choose whichever is simpler.

**Files to edit**:
- `src/renderer/components/SpeechBubble.tsx`
- `src/renderer/App.tsx` (render the bubble)

### [ ] 6.3 -- Wire click-to-talk

**Description**: Clicking the pet sprite triggers a Claude API call. The pet's response appears in the speech bubble.

**Acceptance criteria**:
- Left-clicking the sprite sends a "user clicked the pet" message to Claude via IPC
- Main process calls `ClaudeBridge.chat()` with a prompt like "The user clicked on you. Say something based on how you're feeling."
- Response appears in the speech bubble
- While waiting for the API response, show a "..." or thinking indicator
- Clicking while a bubble is showing dismisses the old bubble

**Files to edit**:
- `src/renderer/components/Pet.tsx` (click handler)
- `src/main/ipc.ts` (add talk channel)
- `src/preload/index.ts` (expose talk IPC)
- `src/main/claude-bridge.ts` (if needed)

### [ ] 6.4 -- Implement idle chatter

**Description**: Per spec Section 2.4, the pet speaks unprompted every ~20 minutes with idle chatter.

**Acceptance criteria**:
- A timer fires every ~20 minutes (with some randomness, e.g., 15-25 min)
- Timer triggers a Claude API call with a prompt like "Say something unprompted. You're just hanging out."
- Response appears in the speech bubble
- Timer resets if the user manually talks to the pet (avoid double-talking)
- If API key is not set, skip idle chatter

**Files to edit**:
- `src/main/claude-bridge.ts` (add idle chatter timer)
- `src/main/index.ts` (start timer)

### [ ] 6.5 -- Implement stat-threshold speech triggers

**Description**: Per spec Section 2.4, the pet speaks when a stat crosses a threshold (e.g., hunger drops below 20).

**Acceptance criteria**:
- When hunger drops below 30, pet says something about being hungry (one-time trigger per threshold crossing, not every tick)
- When happiness drops below 30, pet says something sad
- When energy drops below 20, pet says something sleepy
- Debounce: each threshold only triggers once until the stat recovers above the threshold

**Files to edit**:
- `src/main/pet-state.ts` (add threshold detection to tick)
- `src/main/claude-bridge.ts` (add threshold-specific prompts)

### [ ] 6.6 -- Wire the lid-open "welcome back" message

**Description**: Connect the resume hook from Step 4.2 to the Claude bridge so the pet says hello when the lid opens.

**Acceptance criteria**:
- On resume, after a short delay (1-2 seconds for the screen to wake), trigger a Claude call
- Prompt includes context: "The user just opened their laptop. Welcome them back."
- Response shows in the speech bubble
- Pet mood is `happy` during this (already set in Step 4.2)

**Files to edit**:
- `src/main/power-monitor.ts` (trigger Claude call on resume)
- `src/main/claude-bridge.ts` (if needed)

---

## Step 7: Real Sprite Art and Animations

### [ ] 7.1 -- Create or source placeholder sprite PNGs

**Description**: Create simple pixel-art or hand-drawn PNG sprites for each pet state. These are placeholders -- structure the code so swapping in better art later is trivial (per spec Section 2.3).

**Acceptance criteria**:
- PNG files exist for each state: `idle.png`, `happy.png`, `sad.png`, `eating.png`, `sleeping.png`, `farting.png`
- Each sprite is ~120x120px with transparent background
- Sprites are visually distinct per state (even if crude)
- All sprites are in `src/renderer/assets/sprites/`

**Files to create**:
- `src/renderer/assets/sprites/idle.png`
- `src/renderer/assets/sprites/happy.png`
- `src/renderer/assets/sprites/sad.png`
- `src/renderer/assets/sprites/eating.png`
- `src/renderer/assets/sprites/sleeping.png`
- `src/renderer/assets/sprites/farting.png`

### [ ] 7.2 -- Implement sprite switching based on mood

**Description**: Update `Pet.tsx` to display the correct sprite PNG based on the current pet mood. Replace the colored circle from Step 2.2.

**Acceptance criteria**:
- Pet component receives current mood via IPC/props
- Correct sprite displays for each mood
- Transitions between sprites are not jarring (simple crossfade or instant swap is fine)
- Sprite retains drag functionality
- Click-through on transparent areas still works

**Files to edit**:
- `src/renderer/components/Pet.tsx`

### [ ] 7.3 -- Add simple CSS animations

**Description**: Add subtle idle animations to make the pet feel alive. Keep it simple per spec ("CSS-animated SVG" or basic CSS transforms on PNGs).

**Acceptance criteria**:
- Idle state: gentle floating/bobbing animation (CSS `@keyframes`)
- Happy state: bouncing or wiggling
- Sad state: slower, droopy motion
- Eating state: chomping motion or scale pulse
- Sleeping state: slow breathing (scale up/down)
- Farting state: shaking + brief green tint or cloud effect

**Files to edit**:
- `src/renderer/components/Pet.tsx` (add CSS animation classes)
- `src/renderer/index.css` (define keyframes)

---

## Step 8: Settings Panel

### [ ] 8.1 -- Create the Settings component UI

**Description**: Build the `Settings.tsx` component with all the controls listed in spec Section 2.6.

**Acceptance criteria**:
- Anthropic API key input (password field, with show/hide toggle)
- Fart volume slider (0-100)
- Fart enabled/disabled toggle
- "Mute fart for next 2 hours" button
- Reset pet button (with confirmation dialog)
- Uninstall fart daemon button (with confirmation dialog)
- Displays which fart detection method is currently installed (LidAngleSensor / notifyutil / none)
- Clean, usable UI styled with Tailwind

**Files to edit**:
- `src/renderer/components/Settings.tsx`

### [ ] 8.2 -- Create a Settings window

**Description**: Settings should open in a separate BrowserWindow (not in the 200x200 pet window). Wire the "Settings" context menu item to open it.

**Acceptance criteria**:
- Clicking "Settings" in context menu opens a new ~400x500 non-transparent window
- Only one settings window can be open at a time
- Settings window is not always-on-top
- Closing the settings window does not quit the app

**Files to edit**:
- `src/main/index.ts` or `src/main/pet-window.ts` (create settings window)
- `src/main/ipc.ts` (settings window IPC)

### [ ] 8.3 -- Wire settings to persisted config

**Description**: All settings values are read from and written to `electron-store`.

**Acceptance criteria**:
- API key is saved to store (encrypted or at minimum not in plain JSON -- use `electron-store`'s `encryptionKey` option)
- Fart volume is saved and applied to `afplay` volume argument
- Fart enabled/disabled state is saved and checked by both daemon scripts and Electron fallback
- Settings persist across app restart

**Files to edit**:
- `src/main/ipc.ts` (settings read/write IPC handlers)
- `src/preload/index.ts` (expose settings IPC)
- `src/renderer/components/Settings.tsx` (load/save settings via IPC)

### [ ] 8.4 -- Wire settings actions to backend functions

**Description**: Connect the settings UI buttons to the actual backend operations.

**Acceptance criteria**:
- "Reset pet" calls a function that resets pet state to defaults and confirms to the user
- "Uninstall fart daemon" calls `uninstallFartDaemon()` from Step 5.4 and updates the UI
- "Mute for 2 hours" calls `muteForDuration(2 * 60 * 60 * 1000)` from Step 5.6
- Fart volume slider updates the volume argument passed to `afplay` (e.g., `afplay -v <0-1>`)
- API key changes take effect immediately (reinitialize `ClaudeBridge`)

**Files to edit**:
- `src/main/ipc.ts`
- `src/main/pet-state.ts` (add `resetPet()`)
- `src/main/claude-bridge.ts` (add `updateApiKey()`)

---

## Step 9: Polish

### [ ] 9.1 -- Hide from Dock

**Description**: The app should not show in the macOS Dock. It is a background utility.

**Acceptance criteria**:
- App does not appear in the Dock
- App does not appear in Cmd+Tab app switcher
- Pet window is still visible and interactive on screen
- Use `app.dock.hide()` or set `LSUIElement` in `Info.plist`

**Files to edit**:
- `src/main/index.ts` (add `app.dock.hide()`)

### [ ] 9.2 -- Add a menu bar tray icon

**Description**: Since the app has no Dock icon, add a menu bar tray icon so the user can access Settings and Quit without right-clicking the sprite.

**Acceptance criteria**:
- Small icon appears in the macOS menu bar
- Clicking it shows a menu: Settings, Mute Fart (2hr), separator, Quit
- Tray icon persists for the lifetime of the app

**Files to edit**:
- `src/main/index.ts` (create Tray)
- A small tray icon image (~16x16 or 22x22 @2x)

### [ ] 9.3 -- Autostart on login

**Description**: Add an option (in Settings) to start the app automatically on macOS login.

**Acceptance criteria**:
- Toggle in Settings: "Start on login"
- Uses Electron's `app.setLoginItemSettings({ openAtLogin: true/false })`
- Default: enabled
- Setting persists

**Files to edit**:
- `src/renderer/components/Settings.tsx` (add toggle)
- `src/main/ipc.ts` (handle autostart IPC)

### [ ] 9.4 -- App icon

**Description**: Create or source a simple app icon for the packaged app.

**Acceptance criteria**:
- `.icns` file for macOS in `resources/`
- Icon is referenced in the build config
- Placeholder is fine (can be the pet sprite on a colored background)

**Files to create**:
- `resources/icon.icns`

### [ ] 9.5 -- Package with electron-builder

**Description**: Configure `electron-builder` to produce a distributable `.dmg` for macOS.

**Acceptance criteria**:
- `electron-builder` is a dev dependency
- Build config in `package.json` or `electron-builder.yml`
- `npm run build` produces a `.dmg` file
- The packaged app launches correctly, pet appears, fart daemon installs
- `fart.wav`, daemon scripts, and plist are included in the app bundle (`extraResources` or `extraFiles`)
- Code signing is NOT required for v1 (can be unsigned)

**Files to edit**:
- `package.json` (add build config and scripts)
- `electron-builder.yml` (if using external config)

### [ ] 9.6 -- Final integration test

**Description**: End-to-end test of all features in the packaged app.

**Acceptance criteria (matches spec Section 7 Definition of Done)**:
- App launches, pet appears on desktop, transparent and always-on-top
- Pet stats decay and persist across launches
- Clicking pet triggers a Claude-generated message in a speech bubble
- Closing the lid plays a fart sound reliably (tested 10 times in a row)
- Opening the lid wakes the pet and triggers a hello
- Settings panel works, fart can be muted
- App can be installed, autostarts on login, can be cleanly uninstalled

---

## Quality Checklist (apply to every task)

- [ ] TypeScript strict mode -- no `any` types without justification
- [ ] All shell-outs use absolute paths that resolve correctly in both dev and packaged mode
- [ ] No background processes appended with `&` in any commands
- [ ] No server startup commands -- assume dev server is already running
- [ ] Error handling: every shell-out and API call has a try/catch or `.catch()`
- [ ] macOS only -- no Windows/Linux conditionals

## Technical Notes

- **LidAngleSensor**: `brew install lidanglesensor`. Does not work on M1/M2 Macs. The installer (Task 5.4) auto-detects availability and falls back to `notifyutil`.
- **Fart sound**: Use a CC0-licensed WAV file. TODO in code to swap for a better one.
- **electron-store**: Use for both pet state and app settings (API key, preferences).
- **Window resizing for speech bubble**: The 200x200 window may need to temporarily resize or a second window may be needed. Decide during implementation of Task 6.2.
- **Image sources if needed**: Use Unsplash or https://picsum.photos/ only. Never use Pexels.
