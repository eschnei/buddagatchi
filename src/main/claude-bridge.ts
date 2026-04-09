import Anthropic from '@anthropic-ai/sdk'
import Store from 'electron-store'
import { BrowserWindow } from 'electron'
import { getCurrentState } from './pet-state'
import type { PetState } from './pet-state'
import { loadBuddyConfig, buddyConfigWatcher } from './buddy-config'
import type { BuddyConfig } from './buddy-config'

// --- Config store for API key ---

const configStore = new Store<{ anthropicApiKey?: string }>({
  name: 'config'
})

// --- Fallback messages for when the API is unavailable ---

const FALLBACK_MESSAGES = [
  '* yawns *',
  '* stretches *',
  '* blinks slowly *',
  '* wiggles *',
  '* looks around curiously *',
  '* scratches ear *',
  '* sniffs the air *',
  '* tilts head *'
]

function randomFallback(): string {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)]
}

// --- System prompt builder ---

function buildStatBlock(petState: PetState): string {
  return `Your current stats:
- Hunger: ${Math.round(petState.hunger)}/100 ${petState.hunger < 30 ? '(very hungry!)' : petState.hunger < 50 ? '(getting hungry)' : '(well fed)'}
- Happiness: ${Math.round(petState.happiness)}/100 ${petState.happiness < 30 ? '(feeling sad)' : petState.happiness < 50 ? '(could be happier)' : '(feeling good!)'}
- Energy: ${Math.round(petState.energy)}/100 ${petState.energy < 20 ? '(exhausted)' : petState.energy < 50 ? '(a bit tired)' : '(energetic!)'}
- Current mood: ${petState.mood}

Your dialogue MUST reflect how you're currently feeling based on these stats. If you're hungry, mention food. If you're tired, yawn or mention sleep. If you're happy, be more energetic and playful.

CRITICAL RULES:
- Keep every response to 1-2 SHORT sentences maximum.
- Be expressive — use actions in asterisks like *bounces* or *wiggles*.
- Never break character. You are the pet, not an AI assistant.
- Be cute but with a mischievous edge.
- Do not use emojis.`
}

function buildSystemPrompt(petState: PetState, buddy: BuddyConfig | null): string {
  if (buddy) {
    return `You are ${buddy.name}. ${buddy.personality}. You are a desktop companion living on the user's screen as a tamagotchi pet. You know that you fart when the user closes their laptop, and you're not embarrassed about it — you think it's funny.

${buildStatBlock(petState)}`
  }

  return `You are a small, mischievous desktop creature that lives on the user's screen. You are their Buddagatchi — a tiny tamagotchi-like pet. You have a playful, slightly cheeky personality. You know that you fart when the user closes their laptop, and you're not embarrassed about it — you think it's funny. (Tip: the user can run /buddy in Claude Code to hatch you a unique personality!)

${buildStatBlock(petState)}`
}

// --- Claude Bridge class ---

class ClaudeBridge {
  private client: Anthropic | null = null
  private idleChatTimer: ReturnType<typeof setTimeout> | null = null
  private buddyConfig: BuddyConfig | null = null

  constructor() {
    this.initClient()
    this.buddyConfig = loadBuddyConfig()
    console.log('[ClaudeBridge] Buddy config loaded:', this.buddyConfig ? `${this.buddyConfig.name} (${this.buddyConfig.personality.slice(0, 50)}...)` : 'none')

    // Watch for buddy config changes
    buddyConfigWatcher.on('change', (config: BuddyConfig | null) => {
      this.buddyConfig = config
      this.updateWindowTitles()
    })
    buddyConfigWatcher.start()
  }

  /** Get the current buddy config */
  getBuddyConfig(): BuddyConfig | null {
    return this.buddyConfig
  }

  /** Reload buddy config from disk */
  reloadBuddyConfig(): BuddyConfig | null {
    this.buddyConfig = loadBuddyConfig()
    this.updateWindowTitles()
    return this.buddyConfig
  }

  /** Update window titles to reflect buddy name */
  private updateWindowTitles(): void {
    const title = this.buddyConfig ? `Buddagatchi - ${this.buddyConfig.name}` : 'Buddagatchi'
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.setTitle(title)
      }
    }
  }

  /** Re-initialize the Anthropic client (e.g. when API key changes) */
  initClient(): void {
    const apiKey = configStore.get('anthropicApiKey')
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
    } else {
      this.client = null
    }
  }

  /** Update the stored API key and re-init the client */
  updateApiKey(key: string): void {
    configStore.set('anthropicApiKey', key)
    this.initClient()
  }

  /** Check if an API key is configured */
  hasApiKey(): boolean {
    return this.client !== null
  }

  /** Send a message to Claude with the pet's personality */
  async chat(userMessage: string, petState: PetState): Promise<string> {
    if (!this.client) {
      return randomFallback()
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        system: buildSystemPrompt(petState, this.buddyConfig),
        messages: [
          { role: 'user', content: userMessage }
        ]
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        return textBlock.text
      }
      return randomFallback()
    } catch (error) {
      console.warn('[ClaudeBridge] API error:', error)
      return randomFallback()
    }
  }

  // --- Idle chatter (Task 6.4) ---

  /** Start the idle chatter timer. Fires every 15-25 minutes at random. */
  startIdleChatter(): void {
    this.scheduleNextIdleChat()
  }

  /** Stop idle chatter */
  stopIdleChatter(): void {
    if (this.idleChatTimer) {
      clearTimeout(this.idleChatTimer)
      this.idleChatTimer = null
    }
  }

  /** Reset idle timer (e.g. when the user manually talks to the pet) */
  resetIdleTimer(): void {
    this.stopIdleChatter()
    this.scheduleNextIdleChat()
  }

  private scheduleNextIdleChat(): void {
    // Random interval between 15 and 25 minutes
    const minMs = 15 * 60 * 1000
    const maxMs = 25 * 60 * 1000
    const delay = minMs + Math.random() * (maxMs - minMs)

    this.idleChatTimer = setTimeout(async () => {
      await this.triggerIdleChat()
      this.scheduleNextIdleChat()
    }, delay)
  }

  private async triggerIdleChat(): Promise<void> {
    if (!this.hasApiKey()) return

    const petState = getCurrentState()
    const message = await this.chat(
      'Say something unprompted. You are just hanging out on the desktop. Be spontaneous and in-character.',
      petState
    )

    this.sendSpeechToRenderer(message)
  }

  // --- Speech delivery to renderer ---

  /** Send a speech message to all renderer windows */
  sendSpeechToRenderer(text: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('pet:speech', text)
      }
    }
  }

  // --- Stat threshold triggers (Task 6.5) ---

  private thresholdFlags = {
    hungerLow: false,
    happinessLow: false,
    energyLow: false
  }

  /** Check stat thresholds and trigger speech if crossed. Called from pet-state tick. */
  async checkThresholds(state: PetState): Promise<void> {
    if (!this.hasApiKey()) return

    // Hunger < 30
    if (state.hunger < 30 && !this.thresholdFlags.hungerLow) {
      this.thresholdFlags.hungerLow = true
      const msg = await this.chat(
        'Your hunger is very low. Complain about being hungry and ask the user to feed you.',
        state
      )
      this.sendSpeechToRenderer(msg)
    } else if (state.hunger >= 30) {
      this.thresholdFlags.hungerLow = false
    }

    // Happiness < 30
    if (state.happiness < 30 && !this.thresholdFlags.happinessLow) {
      this.thresholdFlags.happinessLow = true
      const msg = await this.chat(
        'Your happiness is very low. Express sadness and ask the user to pet you or play with you.',
        state
      )
      this.sendSpeechToRenderer(msg)
    } else if (state.happiness >= 30) {
      this.thresholdFlags.happinessLow = false
    }

    // Energy < 20
    if (state.energy < 20 && !this.thresholdFlags.energyLow) {
      this.thresholdFlags.energyLow = true
      const msg = await this.chat(
        'Your energy is critically low. Express how exhausted you are.',
        state
      )
      this.sendSpeechToRenderer(msg)
    } else if (state.energy >= 20) {
      this.thresholdFlags.energyLow = false
    }
  }

  // --- Welcome back (Task 6.6) ---

  /** Trigger a welcome back message after lid open */
  async triggerWelcomeBack(): Promise<void> {
    const petState = getCurrentState()
    const message = await this.chat(
      'The user just opened their laptop. Welcome them back. Be excited and happy to see them.',
      petState
    )
    this.sendSpeechToRenderer(message)
  }
}

// --- Singleton export ---

export const claudeBridge = new ClaudeBridge()
