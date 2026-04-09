import { execSync, execFile } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'

const HOME = os.homedir()
const BUDDY_DIR = path.join(HOME, '.desktop-buddy')
const SCRIPT_DEST = path.join(BUDDY_DIR, 'fart-daemon.sh')
const FART_WAV_DEST = path.join(BUDDY_DIR, 'fart.mp3')
const PLIST_NAME = 'com.ericschneider.desktopbuddy.fart.plist'
const PLIST_DEST = path.join(HOME, 'Library', 'LaunchAgents', PLIST_NAME)
const MUTE_FILE = path.join(HOME, '.desktop-buddy-fart-mute')
const LOG_PATH = path.join(HOME, 'Library', 'Logs', 'desktop-buddy-fart.log')

type DetectionMethod = 'lid-angle' | 'notifyutil' | 'none'

function getResourcePath(filename: string): string {
  // In development, resources are in the project root's resources/ dir.
  // In production (packaged), they are in the app's resources/ dir.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, filename)
  }
  return path.join(app.getAppPath(), 'resources', filename)
}

function hasLidAngleSensor(): boolean {
  try {
    execSync('which lidanglesensor', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function buildPlistContent(): string {
  const templatePath = getResourcePath(PLIST_NAME)
  let content = fs.readFileSync(templatePath, 'utf-8')
  content = content.replace(/__SCRIPT_PATH__/g, SCRIPT_DEST)
  content = content.replace(/__FART_WAV_PATH__/g, FART_WAV_DEST)
  content = content.replace(/__LOG_PATH__/g, LOG_PATH)
  return content
}

export function getInstalledDetectionMethod(): DetectionMethod {
  if (!fs.existsSync(SCRIPT_DEST)) {
    return 'none'
  }
  try {
    const content = fs.readFileSync(SCRIPT_DEST, 'utf-8')
    if (content.includes('lidanglesensor')) {
      return 'lid-angle'
    }
    if (content.includes('notifyutil')) {
      return 'notifyutil'
    }
  } catch {
    // Fall through
  }
  return 'none'
}

export function isFartDaemonInstalled(): boolean {
  return fs.existsSync(PLIST_DEST) && fs.existsSync(SCRIPT_DEST)
}

export interface InstallResult {
  success: boolean
  method: DetectionMethod
  message: string
}

export function installFartDaemon(): InstallResult {
  try {
    // 1. Create ~/.desktop-buddy/ directory
    fs.mkdirSync(BUDDY_DIR, { recursive: true })

    // 2. Check which detection method to use
    const useLidAngle = hasLidAngleSensor()
    const method: DetectionMethod = useLidAngle ? 'lid-angle' : 'notifyutil'

    // 3. Copy the appropriate script
    const scriptSource = useLidAngle
      ? getResourcePath('fart-daemon-lid-angle.sh')
      : getResourcePath('fart-daemon.sh')
    fs.copyFileSync(scriptSource, SCRIPT_DEST)

    // 4. Copy fart.mp3
    const wavSource = getResourcePath(path.join('..', 'src', 'renderer', 'assets', 'fart.mp3'))
    // Try the development path first, then fall back to packaged path
    let wavSourceResolved: string
    if (fs.existsSync(wavSource)) {
      wavSourceResolved = wavSource
    } else {
      // In packaged app, fart.mp3 should be in resources/
      const packagedWav = getResourcePath('fart.mp3')
      if (fs.existsSync(packagedWav)) {
        wavSourceResolved = packagedWav
      } else {
        // Last resort: look in the renderer assets via app path
        wavSourceResolved = path.join(app.getAppPath(), 'src', 'renderer', 'assets', 'fart.mp3')
      }
    }

    if (fs.existsSync(wavSourceResolved)) {
      fs.copyFileSync(wavSourceResolved, FART_WAV_DEST)
    } else {
      return {
        success: false,
        method: 'none',
        message: `fart.mp3 not found at ${wavSourceResolved}`
      }
    }

    // 5. Make the script executable
    fs.chmodSync(SCRIPT_DEST, '755')

    // 6. Write the plist with correct paths
    const launchAgentsDir = path.join(HOME, 'Library', 'LaunchAgents')
    fs.mkdirSync(launchAgentsDir, { recursive: true })
    const plistContent = buildPlistContent()
    fs.writeFileSync(PLIST_DEST, plistContent, 'utf-8')

    // 7. Load the plist via launchctl
    try {
      // Unload first in case it was previously loaded
      execSync(`launchctl unload "${PLIST_DEST}" 2>/dev/null`, { stdio: 'pipe' })
    } catch {
      // Ignore -- may not have been loaded
    }
    execSync(`launchctl load "${PLIST_DEST}"`, { stdio: 'pipe' })

    const methodLabel = useLidAngle ? 'LidAngleSensor' : 'lid-close notification (notifyutil)'
    return {
      success: true,
      method,
      message: `Fart daemon installed (using ${methodLabel})`
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      method: 'none',
      message: `Failed to install fart daemon: ${errorMessage}`
    }
  }
}

export function uninstallFartDaemon(): void {
  try {
    // 1. Unload the plist
    if (fs.existsSync(PLIST_DEST)) {
      try {
        execSync(`launchctl unload "${PLIST_DEST}"`, { stdio: 'pipe' })
      } catch {
        // Ignore -- may not have been loaded
      }
      // 2. Remove the plist
      fs.unlinkSync(PLIST_DEST)
    }

    // 3. Remove ~/.desktop-buddy/ directory
    if (fs.existsSync(BUDDY_DIR)) {
      fs.rmSync(BUDDY_DIR, { recursive: true, force: true })
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Failed to uninstall fart daemon: ${errorMessage}`)
  }
}

// --- Mute file mechanism (Task 5.6) ---

let muteTimeout: ReturnType<typeof setTimeout> | null = null

export function muteFart(): void {
  fs.writeFileSync(MUTE_FILE, `muted at ${new Date().toISOString()}\n`, 'utf-8')
}

export function unmuteFart(): void {
  if (muteTimeout) {
    clearTimeout(muteTimeout)
    muteTimeout = null
  }
  try {
    if (fs.existsSync(MUTE_FILE)) {
      fs.unlinkSync(MUTE_FILE)
    }
  } catch {
    // Ignore
  }
}

export function muteForDuration(ms: number): void {
  muteFart()
  if (muteTimeout) {
    clearTimeout(muteTimeout)
  }
  muteTimeout = setTimeout(() => {
    unmuteFart()
    muteTimeout = null
  }, ms)
}

export function isMuted(): boolean {
  return fs.existsSync(MUTE_FILE)
}
