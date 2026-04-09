import { powerMonitor, app } from 'electron'
import { execFile } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { wakeUp } from './pet-state'
import { isMuted } from './fart-installer'
import { claudeBridge } from './claude-bridge'
import { lidMonitor } from './lid-monitor'

// --- Fart sound cycling ---

let fartSounds: string[] = []
let fartIndex = 0

/**
 * Discover all fart sound files in the resources directory.
 */
function loadFartSounds(): void {
  const resourcesDir = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(app.getAppPath(), 'resources')

  try {
    const files = readdirSync(resourcesDir)
    fartSounds = files
      .filter((f) => /^fart\d*\.(mp3|wav|m4a)$/i.test(f))
      .sort()
      .map((f) => join(resourcesDir, f))
    console.log(`[PowerMonitor] Found ${fartSounds.length} fart sound(s):`, fartSounds.map((f) => f.split('/').pop()))
  } catch {
    fartSounds = []
  }
}

/**
 * Play the next fart sound, cycling through all available files.
 */
function playFartSound(): void {
  console.log('[PowerMonitor] playFartSound() called')
  if (isMuted()) {
    console.log('[PowerMonitor] Fart is muted, skipping playback')
    return
  }

  if (fartSounds.length === 0) {
    console.warn('[PowerMonitor] No fart sounds found')
    return
  }

  const fartPath = fartSounds[fartIndex % fartSounds.length]
  fartIndex++

  if (!existsSync(fartPath)) {
    console.warn('[PowerMonitor] fart sound not found at:', fartPath)
    return
  }

  console.log('[PowerMonitor] Playing fart sound:', fartPath.split('/').pop())

  execFile('afplay', [fartPath], (error) => {
    if (error) {
      console.warn('[PowerMonitor] afplay error:', error.message)
    }
  })
}

/**
 * Test fart sound playback (for the context menu "Test Fart" button).
 */
export function testFartSound(): void {
  console.log('[PowerMonitor] Test fart triggered')
  playFartSound()
}

/**
 * Set up power monitor event listeners. Must be called after app.whenReady().
 */
export function setupPowerMonitor(): void {
  loadFartSounds()

  // Primary: Poll lid angle — fires BEFORE system sleeps
  lidMonitor.on('lid-closing', () => {
    console.log('[PowerMonitor] Lid closing detected — playing fart')
    playFartSound()
  })

  lidMonitor.on('lid-opened', () => {
    console.log('[PowerMonitor] Lid opened detected')
  })

  lidMonitor.start()

  // Fallback: Electron power monitor events
  powerMonitor.on('suspend', () => {
    console.log(`[PowerMonitor] System suspending at ${new Date().toISOString()}`)
  })

  powerMonitor.on('resume', () => {
    console.log(`[PowerMonitor] System resumed at ${new Date().toISOString()}`)
    wakeUp()

    setTimeout(() => {
      claudeBridge.triggerWelcomeBack()
    }, 1500)
  })

  console.log('[PowerMonitor] Power monitor listeners registered (with lid angle polling)')
}
