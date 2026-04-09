import { spawn, execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { EventEmitter } from 'events'

const FART_THRESHOLD = 50 // degrees — trigger fart when lid drops below this

/**
 * Monitors the MacBook lid angle by spawning a compiled Swift helper
 * that reads the HID lid angle sensor. Triggers events when the lid
 * crosses the threshold angle, so the fart plays WHILE the lid is closing.
 */
class LidMonitor extends EventEmitter {
  private process: ReturnType<typeof spawn> | null = null
  private lastAngle: number | null = null
  private fartPlayed = false // debounce: don't fart again until lid reopens
  private readerPath: string | null = null

  /**
   * Start polling lid angle via the Swift helper in --poll mode.
   */
  start(): void {
    this.readerPath = this.findReader()
    if (!this.readerPath) {
      console.log('[LidMonitor] lid-angle-reader not found, falling back to ioreg polling')
      this.startIoregFallback()
      return
    }

    console.log(`[LidMonitor] Starting lid angle polling via ${this.readerPath} (threshold: ${FART_THRESHOLD} degrees)`)

    this.process = spawn(this.readerPath, ['--poll'], { stdio: ['ignore', 'pipe', 'pipe'] })

    let buffer = ''
    this.process.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // keep incomplete line in buffer

      for (const line of lines) {
        const angle = parseInt(line.trim(), 10)
        if (isNaN(angle)) continue
        this.handleAngle(angle)
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      console.warn('[LidMonitor] stderr:', data.toString().trim())
    })

    this.process.on('exit', (code) => {
      console.log(`[LidMonitor] lid-angle-reader exited with code ${code}`)
      this.process = null
      // If it crashes, fall back to ioreg
      if (code !== 0) {
        console.log('[LidMonitor] Falling back to ioreg polling')
        this.startIoregFallback()
      }
    })
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    if (this.ioregInterval) {
      clearInterval(this.ioregInterval)
      this.ioregInterval = null
    }
  }

  private handleAngle(angle: number): void {
    if (this.lastAngle === null) {
      this.lastAngle = angle
      console.log(`[LidMonitor] Initial lid angle: ${angle} degrees`)
      return
    }

    // Lid closing past threshold
    if (angle < FART_THRESHOLD && !this.fartPlayed) {
      console.log(`[LidMonitor] Lid at ${angle} degrees (below ${FART_THRESHOLD}) — triggering fart!`)
      this.fartPlayed = true
      this.emit('lid-closing')
    }

    // Lid reopened — reset debounce
    if (angle > FART_THRESHOLD + 10 && this.fartPlayed) {
      console.log(`[LidMonitor] Lid reopened to ${angle} degrees — resetting`)
      this.fartPlayed = false
      this.emit('lid-opened')
    }

    this.lastAngle = angle
  }

  private findReader(): string | null {
    // In packaged app
    if (app.isPackaged) {
      const packaged = join(process.resourcesPath, 'resources', 'lid-angle-reader')
      if (existsSync(packaged)) return packaged
    }
    // In dev
    const dev = join(app.getAppPath(), 'resources', 'lid-angle-reader')
    if (existsSync(dev)) return dev
    return null
  }

  // --- ioreg fallback (for Macs without the HID lid sensor) ---

  private ioregInterval: ReturnType<typeof setInterval> | null = null
  private lastClamshellState: boolean | null = null

  private startIoregFallback(): void {
    if (this.ioregInterval) return
    console.log('[LidMonitor] Using ioreg AppleClamshellState fallback')

    this.ioregInterval = setInterval(() => {
      try {
        const output = execFileSync('ioreg', ['-r', '-k', 'AppleClamshellState', '-d', '4'], {
          encoding: 'utf-8',
          timeout: 2000,
        })
        const match = output.match(/"AppleClamshellState"\s*=\s*(Yes|No)/i)
        if (!match) return

        const isClosed = match[1] === 'Yes'

        if (this.lastClamshellState === null) {
          this.lastClamshellState = isClosed
          return
        }

        if (isClosed && !this.lastClamshellState) {
          console.log('[LidMonitor] Clamshell closed (ioreg fallback)')
          this.emit('lid-closing')
        } else if (!isClosed && this.lastClamshellState) {
          console.log('[LidMonitor] Clamshell opened (ioreg fallback)')
          this.emit('lid-opened')
        }

        this.lastClamshellState = isClosed
      } catch {
        // ignore
      }
    }, 500)
  }
}

export const lidMonitor = new LidMonitor()
