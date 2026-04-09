import Store from 'electron-store'

// --- Types ---

export type Mood = 'happy' | 'neutral' | 'sad' | 'hungry' | 'sleepy'

export interface PetState {
  hunger: number // 0-100
  happiness: number // 0-100
  energy: number // 0-100
  mood: Mood
  lastFed: string // ISO timestamp
  lastPet: string // ISO timestamp
  lastInteraction: string // ISO timestamp
  birthday: string // ISO timestamp
}

// --- Defaults ---

export const DEFAULT_PET_STATE: PetState = {
  hunger: 80,
  happiness: 80,
  energy: 100,
  mood: 'happy',
  lastFed: new Date().toISOString(),
  lastPet: new Date().toISOString(),
  lastInteraction: new Date().toISOString(),
  birthday: new Date().toISOString()
}

// --- Persistence ---

const store = new Store<{ petState: PetState }>({
  name: 'pet-state',
  defaults: {
    petState: DEFAULT_PET_STATE
  }
})

export function loadPetState(): PetState {
  return store.get('petState')
}

export function savePetState(state: PetState): void {
  store.set('petState', state)
}

// --- In-memory current state ---

let currentState: PetState = loadPetState()

export function getCurrentState(): PetState {
  return { ...currentState }
}

// --- Mood derivation ---

function deriveMood(state: PetState): Mood {
  if (state.hunger < 30) return 'hungry'
  if (state.energy < 20) return 'sleepy'
  if (state.happiness < 30) return 'sad'

  const avg = (state.hunger + state.happiness + state.energy) / 3
  if (avg >= 60) return 'happy'
  return 'neutral'
}

// --- Stat decay ---

// Decay rates per 60-second tick:
// hunger: ~1 point per 15 min = 1/15 per tick = ~0.067
// happiness: ~1 point per 30 min = 1/30 per tick = ~0.033
// energy: ~1 point per 20 min during activity = ~0.05
const HUNGER_DECAY_PER_TICK = 1 / 15
const HAPPINESS_DECAY_PER_TICK = 1 / 30
const ENERGY_DECAY_PER_TICK = 1 / 20

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function tick(): PetState {
  currentState = {
    ...currentState,
    hunger: clamp(currentState.hunger - HUNGER_DECAY_PER_TICK, 0, 100),
    happiness: clamp(currentState.happiness - HAPPINESS_DECAY_PER_TICK, 0, 100),
    energy: clamp(currentState.energy - ENERGY_DECAY_PER_TICK, 0, 100)
  }
  currentState.mood = deriveMood(currentState)
  savePetState(currentState)
  return getCurrentState()
}

let decayInterval: ReturnType<typeof setInterval> | null = null
let onTickCallback: ((state: PetState) => void) | null = null

export function setOnTickCallback(cb: (state: PetState) => void): void {
  onTickCallback = cb
}

export function startStatDecay(): void {
  if (decayInterval) return
  decayInterval = setInterval(() => {
    const updated = tick()
    if (onTickCallback) {
      onTickCallback(updated)
    }
  }, 60_000)
}

export function stopStatDecay(): void {
  if (decayInterval) {
    clearInterval(decayInterval)
    decayInterval = null
  }
}

// --- Actions ---

export function feedPet(): PetState {
  const now = new Date().toISOString()
  currentState = {
    ...currentState,
    hunger: clamp(currentState.hunger + 20, 0, 100),
    lastFed: now,
    lastInteraction: now
  }
  currentState.mood = deriveMood(currentState)
  savePetState(currentState)
  return getCurrentState()
}

export function petPet(): PetState {
  const now = new Date().toISOString()
  currentState = {
    ...currentState,
    happiness: clamp(currentState.happiness + 15, 0, 100),
    lastPet: now,
    lastInteraction: now
  }
  currentState.mood = deriveMood(currentState)
  savePetState(currentState)
  return getCurrentState()
}

export function resetPet(): PetState {
  const now = new Date().toISOString()
  currentState = {
    ...DEFAULT_PET_STATE,
    lastFed: now,
    lastPet: now,
    lastInteraction: now,
    birthday: now
  }
  savePetState(currentState)
  console.log('[PetState] Pet has been reset to defaults')
  return getCurrentState()
}

export function wakeUp(): PetState {
  const now = new Date().toISOString()
  currentState = {
    ...currentState,
    energy: clamp(currentState.energy + 30, 0, 100),
    mood: 'happy',
    lastInteraction: now
  }
  savePetState(currentState)
  console.log('[PetState] Pet woke up! Energy:', currentState.energy, 'Mood:', currentState.mood)
  return getCurrentState()
}
