import { readFileSync, watchFile, unwatchFile, statSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { EventEmitter } from 'events'

// --- Buddy config types ---

export interface BuddyConfig {
  name: string
  personality: string
  hatchedAt: number
}

// --- File path ---

const CLAUDE_JSON_PATH = join(homedir(), '.claude.json')

// --- Config reader ---

export function loadBuddyConfig(): BuddyConfig | null {
  try {
    // Check file exists before reading
    statSync(CLAUDE_JSON_PATH)

    const raw = readFileSync(CLAUDE_JSON_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.companion &&
      typeof parsed.companion === 'object' &&
      typeof parsed.companion.name === 'string' &&
      typeof parsed.companion.personality === 'string' &&
      typeof parsed.companion.hatchedAt === 'number'
    ) {
      return {
        name: parsed.companion.name,
        personality: parsed.companion.personality,
        hatchedAt: parsed.companion.hatchedAt
      }
    }

    return null
  } catch {
    return null
  }
}

// --- File watcher with event emitter ---

class BuddyConfigWatcher extends EventEmitter {
  private watching = false

  start(): void {
    if (this.watching) return
    this.watching = true

    watchFile(CLAUDE_JSON_PATH, { interval: 5000 }, () => {
      const config = loadBuddyConfig()
      this.emit('change', config)
    })
  }

  stop(): void {
    if (!this.watching) return
    this.watching = false
    unwatchFile(CLAUDE_JSON_PATH)
  }
}

export const buddyConfigWatcher = new BuddyConfigWatcher()
