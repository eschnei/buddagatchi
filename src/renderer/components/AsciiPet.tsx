import { useState, useEffect } from 'react'

// ASCII art frames from Claude Code's buddy system
// Species sprites are 5 lines high with {E} eye placeholder
const SPECIES_FRAMES: Record<string, string[][]> = {
  goose: [
    [
      '            ',
      '     ({E}>  ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '    ({E}>   ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '     ({E}>> ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
  ],
  duck: [
    [
      '            ',
      '   >({E})   ',
      '    ~~||    ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '    >({E})  ',
      '    ~~||    ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '   >({E})   ',
      '     ~||    ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
  ],
  cat: [
    [
      '   /\\_/\\    ',
      '  ( {E} )   ',
      '   > ^ <    ',
      '  /|   |\\   ',
      '  (___)     ',
    ],
    [
      '   /\\_/\\    ',
      '  ( {E} )   ',
      '   > ^ <    ',
      '   |   |    ',
      '  (_____) ~ ',
    ],
    [
      '   /\\_/\\    ',
      '  ( {E} )   ',
      '   > ^ <    ',
      '  \\|   |/   ',
      '  (___)     ',
    ],
  ],
  blob: [
    [
      '            ',
      '   .----.   ',
      '  ( {E}  )  ',
      '   \\    /   ',
      '    ~~~~    ',
    ],
    [
      '            ',
      '   .----.   ',
      '  (  {E} )  ',
      '   \\    /   ',
      '    ~~~~    ',
    ],
    [
      '            ',
      '    .---.   ',
      '  (  {E} )  ',
      '   \\    /   ',
      '    ~~~~    ',
    ],
  ],
}

const EYE_STYLES = ['·', '✦', '×', '◉', '@', '°']

const DANCE_FRAMES = [
  [
    '            ',
    '    \\({E}>  ',
    '     ||/    ',
    '   _(__)_   ',
    '   ^  ^ ^   ',
  ],
  [
    '            ',
    '   <{E})/   ',
    '    \\||     ',
    '   _(__)_   ',
    '  ^ ^  ^    ',
  ],
  [
    '     ♪      ',
    '    \\({E}>  ',
    '     ||/    ',
    '   _(__)_   ',
    '    ^ ^     ',
  ],
  [
    '        ♫   ',
    '   <{E})/   ',
    '    \\||     ',
    '   _(__)_   ',
    '     ^ ^    ',
  ],
]

interface AsciiPetProps {
  species?: string
  mood?: string
  eyeStyle?: number
  color?: string
  hat?: string
  isDancing?: boolean
}

export default function AsciiPet({ species = 'goose', mood, eyeStyle = 0, color, hat, isDancing = false }: AsciiPetProps): JSX.Element {
  const [frameIndex, setFrameIndex] = useState(0)

  // Animate frames — faster when dancing
  useEffect(() => {
    const speed = isDancing ? 250 : 500
    const frameCount = isDancing ? DANCE_FRAMES.length : 3
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameCount)
    }, speed)
    return () => clearInterval(interval)
  }, [isDancing])

  const idleFrames = SPECIES_FRAMES[species] ?? SPECIES_FRAMES.goose
  const frames = isDancing ? DANCE_FRAMES : idleFrames
  const frame = frames[frameIndex % frames.length] ?? frames[0]
  const eye = EYE_STYLES[eyeStyle % EYE_STYLES.length]

  // Replace {E} placeholder with the actual eye character
  const rendered = frame.map((line) => line.replace(/\{E\}/g, eye))

  // Color: use custom color, fall back to mood-based
  const baseColor = color || '#4ADE80'
  const moodColor = mood === 'sad' ? '#8899aa' : mood === 'hungry' ? '#ffaa55' : mood === 'sleepy' ? '#9999cc' : baseColor

  return (
    <div style={{ textAlign: 'center', userSelect: 'none', position: 'relative' }}>
      {hat && (
        <div style={{ fontSize: '24px', lineHeight: 1, marginBottom: '-8px', position: 'relative', zIndex: 1 }}>
          {hat}
        </div>
      )}
      <pre
        style={{
          fontFamily: '"SF Mono", "Menlo", "Monaco", monospace',
          fontSize: '16px',
          lineHeight: '1.2',
          color: moodColor,
          textAlign: 'center',
          userSelect: 'none',
          textShadow: `0 0 8px ${moodColor}40, 0 1px 2px rgba(0,0,0,0.5)`,
          filter: mood === 'sleepy' ? 'brightness(0.7)' : 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {rendered.join('\n')}
      </pre>
    </div>
  )
}
