import { useState, useEffect, useCallback, useRef } from 'react'
import Pet from './components/Pet'
import SpeechBubble from './components/SpeechBubble'
import Settings from './components/Settings'

type Mood = 'happy' | 'neutral' | 'sad' | 'hungry' | 'sleepy'

interface PetStateFromMain {
  mood: Mood
  hunger: number
  happiness: number
  energy: number
}

interface BuddyConfig {
  name: string
  personality: string
  hatchedAt: number
}

function PetApp(): JSX.Element {
  const [speechText, setSpeechText] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [mood, setMood] = useState<Mood>('neutral')
  const [isFarting, setIsFarting] = useState(false)
  const [buddyName, setBuddyName] = useState<string | null>(null)
  const [buddySpecies, setBuddySpecies] = useState<string | null>(null)
  const [petColor, setPetColor] = useState('#4ADE80')
  const [petHat, setPetHat] = useState('')
  const [isDancing, setIsDancing] = useState(false)

  // Listen for pet:speech from main process (idle chatter, thresholds, welcome back)
  useEffect(() => {
    const unsub = window.api.onSpeech((text: string) => {
      setIsThinking(false)
      setSpeechText(text)
    })
    return unsub
  }, [])

  // Listen for dance command from main process
  useEffect(() => {
    const unsub = window.api.onDance(() => {
      setIsDancing(true)
      setSpeechText('* dances wildly *')
      setTimeout(() => setIsDancing(false), 5000)
    })
    return unsub
  }, [])

  // Load buddy config on mount
  useEffect(() => {
    window.api.getBuddy().then((config) => {
      const buddy = config as BuddyConfig | null
      if (buddy?.name) {
        setBuddyName(buddy.name)
        // Detect species from personality text or name
        const text = (buddy.personality + ' ' + buddy.name).toLowerCase()
        const speciesKeywords: Record<string, string[]> = {
          goose: ['goose', 'honk', 'quill'],
          duck: ['duck', 'quack'],
          cat: ['cat', 'feline', 'meow', 'purr'],
          blob: ['blob', 'amorphous', 'goo'],
          rabbit: ['rabbit', 'bunny', 'hop'],
          owl: ['owl', 'hoot', 'wise'],
          penguin: ['penguin', 'waddle'],
          turtle: ['turtle', 'shell', 'slow'],
          snail: ['snail', 'slime'],
          dragon: ['dragon', 'fire', 'flame'],
          octopus: ['octopus', 'tentacle'],
          axolotl: ['axolotl', 'salamander'],
          ghost: ['ghost', 'spirit', 'phantom'],
          robot: ['robot', 'mech', 'beep'],
          cactus: ['cactus', 'prickly', 'desert'],
          mushroom: ['mushroom', 'fungi', 'spore'],
          capybara: ['capybara', 'capy'],
          chonk: ['chonk', 'thicc', 'round'],
        }
        let detected = 'goose' // default
        for (const [species, keywords] of Object.entries(speciesKeywords)) {
          if (keywords.some((k) => text.includes(k))) {
            detected = species
            break
          }
        }
        setBuddySpecies(detected)
      } else {
        // No buddy configured — show nudge on first launch
        setSpeechText('Hey! Run /buddy in Claude Code to hatch me a personality!')
      }
    })
  }, [])

  // Load pet customization from settings
  useEffect(() => {
    window.api.getSettings().then((data) => {
      const d = data as { petColor?: string; petHat?: string }
      if (d.petColor) setPetColor(d.petColor)
      if (d.petHat) setPetHat(d.petHat)
    })
  }, [])

  // Listen for settings changes (when user changes color/hat in settings window)
  useEffect(() => {
    const interval = setInterval(() => {
      window.api.getSettings().then((data) => {
        const d = data as { petColor?: string; petHat?: string }
        if (d.petColor && d.petColor !== petColor) setPetColor(d.petColor)
        if ((d.petHat ?? '') !== petHat) setPetHat(d.petHat ?? '')
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [petColor, petHat])

  // Listen for pet state updates to track mood
  useEffect(() => {
    // Fetch initial state
    window.api.getState().then((state) => {
      const s = state as PetStateFromMain
      if (s?.mood) setMood(s.mood)
    })

    // Subscribe to ongoing state updates
    const unsub = window.api.onStateUpdate((state) => {
      const s = state as PetStateFromMain
      if (s?.mood) setMood(s.mood)
    })
    return unsub
  }, [])

  const handleDismiss = useCallback(() => {
    setSpeechText(null)
    setIsThinking(false)
  }, [])

  // Click counting for single/double/triple click detection
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePetClick = useCallback(() => {
    clickCountRef.current++

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    clickTimerRef.current = setTimeout(async () => {
      const clicks = clickCountRef.current
      clickCountRef.current = 0

      if (clicks >= 3) {
        // Triple click = Feed
        console.log('Triple click: Feed')
        const updated = await window.api.feedPet()
        const s = updated as PetStateFromMain
        if (s?.mood) setMood(s.mood)
        setMood('hungry') // briefly show eating animation
        setSpeechText('* nom nom nom *')
        setTimeout(() => {
          window.api.getState().then((state) => {
            const st = state as PetStateFromMain
            if (st?.mood) setMood(st.mood)
          })
        }, 1500)
      } else if (clicks === 2) {
        // Double click = Pet
        console.log('Double click: Pet')
        const updated = await window.api.petPet()
        const s = updated as PetStateFromMain
        if (s?.mood) setMood(s.mood)
        setSpeechText('* purrs happily *')
      } else {
        // Single click = Talk
        console.log('Single click: Talk')
        if (speechText || isThinking) {
          handleDismiss()
          return
        }
        setIsThinking(true)
        try {
          const response = await window.api.talk()
          setIsThinking(false)
          setSpeechText(response as string)
        } catch {
          setIsThinking(false)
          setSpeechText('* blinks *')
        }
      }
    }, 300) // 300ms window to detect multi-clicks
  }, [speechText, isThinking, handleDismiss])

  // Brief farting animation trigger (can be called from suspend event in future)
  const triggerFart = useCallback(() => {
    setIsFarting(true)
    setTimeout(() => setIsFarting(false), 500)
  }, [])

  // Expose triggerFart for future use (e.g., from IPC suspend event)
  useEffect(() => {
    // Store on window for potential IPC-driven triggering
    ;(window as unknown as Record<string, unknown>).__triggerFart = triggerFart
    return () => {
      delete (window as unknown as Record<string, unknown>).__triggerFart
    }
  }, [triggerFart])

  return (
    <div className="relative w-[200px] h-full">
      <SpeechBubble
        text={speechText}
        isThinking={isThinking}
        onDismiss={handleDismiss}
        speakerName={buddyName}
      />
      <div className="absolute bottom-0 left-0 w-[200px] h-[200px]">
        <Pet mood={mood} isFarting={isFarting} onPetClick={handlePetClick} buddySpecies={buddySpecies} petColor={petColor} petHat={petHat} isDancing={isDancing} />
      </div>
    </div>
  )
}

function App(): JSX.Element {
  const isSettings = window.location.hash === '#settings'

  if (isSettings) {
    return <Settings />
  }

  return <PetApp />
}

export default App
