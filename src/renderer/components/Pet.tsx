declare global {
  interface Window {
    api: {
      mouseEnterSprite: () => void
      mouseLeaveSprite: () => void
      showContextMenu: () => void
      // Step 3: Pet state
      getState: () => Promise<unknown>
      feedPet: () => Promise<unknown>
      petPet: () => Promise<unknown>
      onStateUpdate: (callback: (state: unknown) => void) => () => void
      // Step 6: Claude bridge
      talk: () => Promise<unknown>
      onSpeech: (callback: (text: string) => void) => () => void
      resizeWindow: (width: number, height: number) => void
      // Step 8: Settings
      getSettings: () => Promise<unknown>
      saveSettings: (settings: Record<string, unknown>) => Promise<unknown>
      getDaemonMethod: () => Promise<unknown>
      resetPet: () => Promise<unknown>
      uninstallDaemon: () => Promise<unknown>
      muteFart: (durationMs: number) => Promise<unknown>
      // Step 9: Login item
      getLoginItem: () => Promise<unknown>
      setLoginItem: (enabled: boolean) => Promise<unknown>
      // Buddy config
      getBuddy: () => Promise<unknown>
      refreshBuddy: () => Promise<unknown>
      // Window drag
      moveWindow: (dx: number, dy: number) => void
      // Dance
      onDance: (callback: () => void) => () => void
    }
  }
}

// Sprite imports (fallback for no-buddy mode)
import idleSprite from '../assets/sprites/idle.svg'
import happySprite from '../assets/sprites/happy.svg'
import sadSprite from '../assets/sprites/sad.svg'
import eatingSprite from '../assets/sprites/eating.svg'
import sleepingSprite from '../assets/sprites/sleeping.svg'
import fartingSprite from '../assets/sprites/farting.svg'

import { useRef } from 'react'
import AsciiPet from './AsciiPet'

type Mood = 'happy' | 'neutral' | 'sad' | 'hungry' | 'sleepy'

// Map mood to sprite source
const MOOD_SPRITE_MAP: Record<Mood, string> = {
  happy: happySprite,
  neutral: idleSprite,
  sad: sadSprite,
  hungry: eatingSprite,
  sleepy: sleepingSprite
}

// Map mood to CSS animation class
const MOOD_ANIMATION_MAP: Record<Mood | 'farting', string> = {
  happy: 'animate-pet-happy',
  neutral: 'animate-pet-idle',
  sad: 'animate-pet-sad',
  hungry: 'animate-pet-eating',
  sleepy: 'animate-pet-sleeping',
  farting: 'animate-pet-farting'
}

interface PetProps {
  mood?: Mood
  isFarting?: boolean
  onPetClick?: () => void
  buddySpecies?: string | null
  petColor?: string
  petHat?: string
  isDancing?: boolean
}

export default function Pet({ mood = 'neutral', isFarting = false, onPetClick, buddySpecies, petColor, petHat, isDancing = false }: PetProps): JSX.Element {
  const handleMouseEnter = (): void => {
    window.api.mouseEnterSprite()
  }

  const handleMouseLeave = (): void => {
    window.api.mouseLeaveSprite()
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    window.api.showContextMenu()
  }

  const dragState = useRef({ dragging: false, startX: 0, startY: 0 })

  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) return
    dragState.current = { dragging: false, startX: e.screenX, startY: e.screenY }

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const dx = moveEvent.screenX - dragState.current.startX
      const dy = moveEvent.screenY - dragState.current.startY
      if (!dragState.current.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.current.dragging = true
      }
      if (dragState.current.dragging) {
        window.api.moveWindow(dx, dy)
        dragState.current.startX = moveEvent.screenX
        dragState.current.startY = moveEvent.screenY
      }
    }

    const onMouseUp = (): void => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (!dragState.current.dragging && onPetClick) {
        onPetClick()
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Use ASCII art if a buddy species is set, SVG sprites otherwise
  const useAscii = !!buddySpecies

  const spriteSrc = isFarting ? fartingSprite : (MOOD_SPRITE_MAP[mood] ?? idleSprite)
  const animationClass = isFarting ? MOOD_ANIMATION_MAP.farting : (MOOD_ANIMATION_MAP[mood] ?? MOOD_ANIMATION_MAP.neutral)

  return (
    <div className="flex items-center justify-center w-[200px] h-[200px]">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        className={useAscii ? '' : animationClass}
        style={{
          width: 160,
          height: 160,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {useAscii ? (
          <AsciiPet species={buddySpecies} mood={mood} color={petColor} hat={petHat} isDancing={isDancing} />
        ) : (
          <img
            src={spriteSrc}
            alt={isFarting ? 'farting' : mood}
            width={120}
            height={120}
            draggable={false}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </div>
    </div>
  )
}
