import { app, BrowserWindow, Menu, Notification, Tray, nativeImage } from 'electron'
import { createPetWindow } from './pet-window'
import { openSettingsWindow } from './settings-window'
import { setupIpcHandlers } from './ipc'
import { startStatDecay } from './pet-state'
import { setupPowerMonitor } from './power-monitor'
import { isFartDaemonInstalled, installFartDaemon, muteForDuration } from './fart-installer'
import { claudeBridge } from './claude-bridge'
import { settingsStore } from './settings-store'

// Keep a module-scope reference so the Tray doesn't get garbage collected
let tray: Tray | null = null

function createTray(): void {
  // Create a simple 16x16 tray icon from an inline SVG data URI (a small blob face)
  const svgDataUrl =
    'data:image/svg+xml;base64,' +
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="#4ADE80" stroke="#166534" stroke-width="1"/>
        <circle cx="5.5" cy="6.5" r="1" fill="#166534"/>
        <circle cx="10.5" cy="6.5" r="1" fill="#166534"/>
        <path d="M5 10.5 Q8 13 11 10.5" stroke="#166534" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      </svg>`
    ).toString('base64')

  const icon = nativeImage.createFromDataURL(svgDataUrl)
  // Mark as template so macOS renders it correctly in light/dark menu bar
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Buddagatchi')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: (): void => {
        openSettingsWindow()
      }
    },
    {
      label: 'Mute Fart (2hr)',
      click: (): void => {
        muteForDuration(2 * 60 * 60 * 1000)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  // Task 9.1: Hide from Dock and Cmd+Tab switcher
  // app.dock.hide() // temporarily disabled for debugging

  // Task 9.3: Apply login item settings on startup
  const startOnLogin = settingsStore.get('startOnLogin')
  app.setLoginItemSettings({ openAtLogin: startOnLogin })

  setupIpcHandlers()
  startStatDecay()
  setupPowerMonitor()
  createPetWindow()

  // Task 9.2: Create menu bar tray icon
  createTray()

  // Start idle chatter timer (Task 6.4)
  claudeBridge.startIdleChatter()

  // Auto-install fart daemon on first launch (Task 5.5)
  try {
    if (!isFartDaemonInstalled()) {
      const result = installFartDaemon()
      if (result.success) {
        new Notification({
          title: 'Buddagatchi',
          body: result.message
        }).show()
      } else {
        console.error('Fart daemon installation failed:', result.message)
      }
    }
  } catch (err) {
    console.error('Error checking/installing fart daemon:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPetWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
