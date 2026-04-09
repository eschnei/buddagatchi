import { useEffect, useState } from 'react'

interface SpeechBubbleProps {
  text: string | null
  isThinking: boolean
  onDismiss: () => void
  speakerName?: string | null
}

export default function SpeechBubble({ text, isThinking, onDismiss, speakerName }: SpeechBubbleProps): JSX.Element | null {
  const [visible, setVisible] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  // Fade in when text changes
  useEffect(() => {
    if (text || isThinking) {
      setVisible(true)
      setDisplayedText('')

      // Request window resize to accommodate bubble
      window.api.resizeWindow(200, 340)
    } else {
      setVisible(false)
      // Restore original window size
      window.api.resizeWindow(200, 200)
    }
  }, [text, isThinking])

  // Typewriter effect for text
  useEffect(() => {
    if (!text || isThinking) return

    let index = 0
    setDisplayedText('')

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
      }
    }, 25)

    return (): void => clearInterval(interval)
  }, [text, isThinking])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!text && !isThinking) return

    const timer = setTimeout(() => {
      onDismiss()
    }, 8000)

    return (): void => clearTimeout(timer)
  }, [text, isThinking, onDismiss])

  if (!visible && !text && !isThinking) return null

  return (
    <div
      className={`absolute bottom-[170px] left-1/2 -translate-x-1/2 w-[180px] transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Bubble body */}
      <div
        className="rounded-xl px-3 py-2 text-white text-sm leading-snug shadow-lg"
        style={{
          background: 'rgba(30, 30, 40, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        {speakerName && (
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{speakerName}</div>
        )}
        {isThinking ? (
          <span className="animate-pulse tracking-widest">...</span>
        ) : (
          <span>{displayedText}</span>
        )}
      </div>

      {/* Tail / pointer */}
      <div className="flex justify-center">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '10px solid rgba(30, 30, 40, 0.85)'
          }}
        />
      </div>
    </div>
  )
}
