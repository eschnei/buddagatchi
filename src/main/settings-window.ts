import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let settingsWindow: BrowserWindow | null = null

export function openSettingsWindow(): void {
  // If already open, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    transparent: false,
    frame: true,
    alwaysOnTop: false,
    resizable: false,
    title: 'Buddagatchi Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Closing the settings window should not quit the app
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  // Load the same renderer but with a hash to indicate settings mode
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'settings'
    })
  }
}

export function getSettingsWindow(): BrowserWindow | null {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    return settingsWindow
  }
  return null
}
