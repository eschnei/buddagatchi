import { useState, useEffect, useCallback } from 'react'

interface BuddyConfig {
  name: string
  personality: string
  hatchedAt: number
}

interface SettingsData {
  apiKey: string
  fartVolume: number
  fartEnabled: boolean
  startOnLogin: boolean
  petColor: string
  petHat: string
}

type DaemonMethod = 'lid-angle' | 'notifyutil' | 'none'

const DEFAULT_SETTINGS: SettingsData = {
  apiKey: '',
  fartVolume: 50,
  fartEnabled: true,
  startOnLogin: true,
  petColor: '#4ADE80',
  petHat: ''
}

const COLOR_PRESETS = [
  '#4ADE80', '#22D3EE', '#818CF8', '#F472B6', '#FB923C',
  '#FACC15', '#F87171', '#A78BFA', '#34D399', '#E879F9',
  '#38BDF8', '#FF6B6B', '#C084FC', '#2DD4BF', '#FBBF24',
]

const HAT_OPTIONS = [
  '', '🎩', '👑', '🎓', '🧢', '🪖', '⛑️', '🎀',
  '🌸', '🔥', '⭐', '❄️', '🌈', '💎', '🍕', '🐸',
  '👻', '🎃', '🤠', '🦋', '🌻', '🍄', '🎪', '🪩',
]

export default function Settings(): JSX.Element {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [daemonMethod, setDaemonMethod] = useState<DaemonMethod>('none')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [buddyConfig, setBuddyConfig] = useState<BuddyConfig | null>(null)
  const [buddyLoading, setBuddyLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false)
  const [advancedPassword, setAdvancedPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  // Load settings, daemon method, and buddy config on mount
  useEffect(() => {
    window.api.getSettings().then((data) => {
      const d = data as SettingsData
      setSettings({
        apiKey: d.apiKey ?? '',
        fartVolume: d.fartVolume ?? 50,
        fartEnabled: d.fartEnabled ?? true,
        startOnLogin: d.startOnLogin ?? true,
        petColor: d.petColor ?? '#4ADE80',
        petHat: d.petHat ?? ''
      })
    })
    window.api.getDaemonMethod().then((method) => {
      setDaemonMethod(method as DaemonMethod)
    })
    window.api.getBuddy().then((config) => {
      setBuddyConfig(config as BuddyConfig | null)
    })
  }, [])

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), 3000)
  }, [])

  const handleSave = useCallback(
    async (updates: Partial<SettingsData>) => {
      setSaving(true)
      try {
        const result = (await window.api.saveSettings(updates)) as SettingsData
        setSettings({
          apiKey: result.apiKey ?? '',
          fartVolume: result.fartVolume ?? 50,
          fartEnabled: result.fartEnabled ?? true,
          startOnLogin: result.startOnLogin ?? true,
          petColor: result.petColor ?? '#4ADE80',
          petHat: result.petHat ?? ''
        })
        showStatus('Settings saved')
      } catch {
        showStatus('Failed to save settings')
      } finally {
        setSaving(false)
      }
    },
    [showStatus]
  )

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setSettings((prev) => ({ ...prev, apiKey: value }))
      // Debounce save for API key
    },
    []
  )

  const handleApiKeyBlur = useCallback(() => {
    handleSave({ apiKey: settings.apiKey })
  }, [settings.apiKey, handleSave])

  const handleVolumeChange = useCallback(
    (value: number) => {
      setSettings((prev) => ({ ...prev, fartVolume: value }))
      handleSave({ fartVolume: value })
    },
    [handleSave]
  )

  const handleFartEnabledToggle = useCallback(() => {
    const newValue = !settings.fartEnabled
    setSettings((prev) => ({ ...prev, fartEnabled: newValue }))
    handleSave({ fartEnabled: newValue })
  }, [settings.fartEnabled, handleSave])

  const handleStartOnLoginToggle = useCallback(() => {
    const newValue = !settings.startOnLogin
    setSettings((prev) => ({ ...prev, startOnLogin: newValue }))
    window.api.setLoginItem(newValue)
    handleSave({ startOnLogin: newValue })
  }, [settings.startOnLogin, handleSave])

  const handleMuteForTwoHours = useCallback(async () => {
    try {
      await window.api.muteFart(2 * 60 * 60 * 1000)
      showStatus('Fart muted for 2 hours')
    } catch {
      showStatus('Failed to mute fart')
    }
  }, [showStatus])

  const handleRefreshBuddy = useCallback(async () => {
    setBuddyLoading(true)
    try {
      const config = await window.api.refreshBuddy()
      setBuddyConfig(config as BuddyConfig | null)
      showStatus(config ? 'Buddy config refreshed' : 'No buddy config found')
    } catch {
      showStatus('Failed to read buddy config')
    } finally {
      setBuddyLoading(false)
    }
  }, [showStatus])

  const handleResetPet = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset your pet? This will erase all stats and start fresh.'
    )
    if (!confirmed) return

    try {
      await window.api.resetPet()
      showStatus('Pet has been reset')
    } catch {
      showStatus('Failed to reset pet')
    }
  }, [showStatus])

  const handleUninstallDaemon = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to uninstall the fart daemon? The lid-close fart will only work via the Electron fallback.'
    )
    if (!confirmed) return

    try {
      const result = (await window.api.uninstallDaemon()) as { success: boolean; error?: string }
      if (result.success) {
        setDaemonMethod('none')
        showStatus('Fart daemon uninstalled')
      } else {
        showStatus(`Failed to uninstall: ${result.error ?? 'unknown error'}`)
      }
    } catch {
      showStatus('Failed to uninstall fart daemon')
    }
  }, [showStatus])

  const daemonLabel =
    daemonMethod === 'lid-angle'
      ? 'LidAngleSensor'
      : daemonMethod === 'notifyutil'
        ? 'notifyutil'
        : 'None (not installed)'

  return (
    <div className="settings-root h-screen overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 font-sans">
      <h1 className="text-xl font-bold mb-6">Buddagatchi Settings</h1>

      {/* Status toast */}
      {statusMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
          {statusMessage}
        </div>
      )}

      {/* Buddy Section */}
      <section className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Buddy
        </h2>
        {buddyConfig ? (
          <div>
            <div className="mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Name: </span>
              <span className="text-sm font-semibold">{buddyConfig.name}</span>
            </div>
            <div className="mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Personality: </span>
              <span className="text-sm">{buddyConfig.personality}</span>
            </div>
            <div className="mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Hatched: </span>
              <span className="text-sm">{new Date(buddyConfig.hatchedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No buddy found. Run <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">/buddy</code> in Claude Code to set one up!
          </p>
        )}
        <button
          onClick={handleRefreshBuddy}
          disabled={buddyLoading}
          className="w-full px-4 py-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buddyLoading ? 'Refreshing...' : 'Refresh from Claude Code'}
        </button>
      </section>

      {/* Customization Section */}
      <section className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Customize
        </h2>

        {/* Color picker */}
        <label className="block text-sm font-medium mb-2">Color</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setSettings((prev) => ({ ...prev, petColor: c }))
                handleSave({ petColor: c })
              }}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                settings.petColor === c ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <label
            className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform text-xs"
            title="Custom color"
          >
            +
            <input
              type="color"
              value={settings.petColor}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, petColor: e.target.value }))
                handleSave({ petColor: e.target.value })
              }}
              className="sr-only"
            />
          </label>
        </div>

        {/* Hat picker */}
        <label className="block text-sm font-medium mb-2">Hat</label>
        <div className="flex flex-wrap gap-1">
          {HAT_OPTIONS.map((h, i) => (
            <button
              key={i}
              onClick={() => {
                setSettings((prev) => ({ ...prev, petHat: h }))
                handleSave({ petHat: h })
              }}
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all hover:scale-110 ${
                settings.petHat === h
                  ? 'bg-blue-500 ring-2 ring-blue-400 scale-110'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title={h || 'None'}
            >
              {h || '✕'}
            </button>
          ))}
        </div>
      </section>

      {/* API Key Section */}
      <section className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Anthropic API
        </h2>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <div className="flex gap-2">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={settings.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            onBlur={handleApiKeyBlur}
            placeholder="sk-ant-..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowApiKey((prev) => !prev)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {showApiKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </section>

      {/* General Section */}
      <section className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          General
        </h2>

        {/* Start on login toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Start on login</label>
          <button
            onClick={handleStartOnLoginToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.startOnLogin ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.startOnLogin ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Advanced Section (password-gated) */}
      <section className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setAdvancedOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
        >
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Advanced
          </h2>
          <span className="text-gray-400 text-sm">{advancedOpen ? '▲' : '▼'}</span>
        </button>

        {advancedOpen && !advancedUnlocked && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium mb-2">Enter password to unlock</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={advancedPassword}
                onChange={(e) => {
                  setAdvancedPassword(e.target.value)
                  setPasswordError(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (advancedPassword === 'feelingassy') {
                      setAdvancedUnlocked(true)
                      setPasswordError(false)
                    } else {
                      setPasswordError(true)
                    }
                  }
                }}
                placeholder="Password..."
                className={`flex-1 px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordError ? 'border-red-400 ring-2 ring-red-300' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                onClick={() => {
                  if (advancedPassword === 'feelingassy') {
                    setAdvancedUnlocked(true)
                    setPasswordError(false)
                  } else {
                    setPasswordError(true)
                  }
                }}
                className="px-4 py-2 text-sm rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors"
              >
                Unlock
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-500 mt-1">Wrong password</p>
            )}
          </div>
        )}

        {advancedOpen && advancedUnlocked && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-6">
            {/* Fart Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Fart Settings
              </h3>

              <div className="mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Detection method: </span>
                <span className="text-sm font-medium">{daemonLabel}</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">Fart enabled</label>
                <button
                  onClick={handleFartEnabledToggle}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.fartEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      settings.fartEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Volume</label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{settings.fartVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.fartVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-gray-300 dark:bg-gray-600 accent-blue-500"
                />
              </div>

              <button
                onClick={handleMuteForTwoHours}
                className="w-full px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
              >
                Mute fart for 2 hours
              </button>
            </div>

            {/* Danger Zone */}
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">
                Danger Zone
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResetPet}
                  className="w-full px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors"
                >
                  Reset Pet
                </button>
                <button
                  onClick={handleUninstallDaemon}
                  disabled={daemonMethod === 'none'}
                  className="w-full px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Uninstall Fart Daemon
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {saving && (
        <div className="mt-4 text-center text-sm text-gray-400">Saving...</div>
      )}
    </div>
  )
}
