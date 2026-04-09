import { ipcMain, app, BrowserWindow } from 'electron'
import { getCurrentState, feedPet, petPet, resetPet, setOnTickCallback } from './pet-state'
import { claudeBridge } from './claude-bridge'
import {
  getInstalledDetectionMethod,
  uninstallFartDaemon,
  muteForDuration
} from './fart-installer'
import { settingsStore, SettingsData } from './settings-store'
import type { PetState } from './pet-state'

// --- Channel name constants ---

export const IPC_CHANNELS = {
  // Step 2: Mouse & context menu (defined by pet-window developer)
  MOUSE_ENTER_SPRITE: 'mouse-enter-sprite',
  MOUSE_LEAVE_SPRITE: 'mouse-leave-sprite',
  SHOW_CONTEXT_MENU: 'show-context-menu',

  // Step 3: Pet state
  GET_STATE: 'pet:get-state',
  STATE_UPDATE: 'pet:state-update',
  FEED: 'pet:feed',
  PET: 'pet:pet',

  // Step 6: Claude bridge
  TALK: 'pet:talk',
  SPEECH: 'pet:speech',
  RESIZE_WINDOW: 'pet:resize-window',

  // Step 8: Settings
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',
  GET_DAEMON_METHOD: 'settings:get-daemon-method',
  RESET_PET: 'settings:reset-pet',
  UNINSTALL_DAEMON: 'settings:uninstall-daemon',
  MUTE_FART: 'settings:mute-fart',

  // Step 9: Login item
  GET_LOGIN_ITEM: 'settings:get-login-item',
  SET_LOGIN_ITEM: 'settings:set-login-item',

  // Buddy config
  GET_BUDDY: 'buddy:get',
  REFRESH_BUDDY: 'buddy:refresh'
} as const

// --- Push state to all renderer windows ---

function pushStateToRenderers(state: PetState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.STATE_UPDATE, state)
    }
  }
}

// --- Register IPC handlers ---

export function setupIpcHandlers(): void {
  // Renderer requests current state
  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
    return getCurrentState()
  })

  // Renderer requests feed action
  ipcMain.handle(IPC_CHANNELS.FEED, () => {
    const updated = feedPet()
    pushStateToRenderers(updated)
    return updated
  })

  // Renderer requests pet action
  ipcMain.handle(IPC_CHANNELS.PET, () => {
    const updated = petPet()
    pushStateToRenderers(updated)
    return updated
  })

  // Step 6: Click-to-talk — renderer invokes, main returns Claude response
  ipcMain.handle(IPC_CHANNELS.TALK, async () => {
    const state = getCurrentState()
    claudeBridge.resetIdleTimer()
    const response = await claudeBridge.chat(
      'The user clicked on you. Say something based on how you are feeling.',
      state
    )
    return response
  })

  // Step 6: Resize window for speech bubble
  ipcMain.on(IPC_CHANNELS.RESIZE_WINDOW, (_event, width: number, height: number) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        const [currentX] = win.getPosition()
        const [, currentY] = win.getPosition()
        const [, currentHeight] = win.getSize()
        const heightDiff = height - currentHeight

        // Move the window up to accommodate the taller bubble
        // so the pet stays in the same position on screen
        win.setBounds({
          x: currentX,
          y: currentY - Math.max(0, heightDiff),
          width,
          height
        })
      }
    }
  })

  // Step 8: Settings IPC handlers

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return settingsStore.store
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, settings: Partial<SettingsData>) => {
    if (settings.apiKey !== undefined) {
      settingsStore.set('apiKey', settings.apiKey)
      claudeBridge.updateApiKey(settings.apiKey)
    }
    if (settings.fartVolume !== undefined) {
      settingsStore.set('fartVolume', settings.fartVolume)
    }
    if (settings.fartEnabled !== undefined) {
      settingsStore.set('fartEnabled', settings.fartEnabled)
    }
    if (settings.startOnLogin !== undefined) {
      settingsStore.set('startOnLogin', settings.startOnLogin)
      app.setLoginItemSettings({ openAtLogin: settings.startOnLogin })
    }
    if (settings.petColor !== undefined) {
      settingsStore.set('petColor', settings.petColor)
    }
    if (settings.petHat !== undefined) {
      settingsStore.set('petHat', settings.petHat)
    }
    return settingsStore.store
  })

  ipcMain.handle(IPC_CHANNELS.GET_DAEMON_METHOD, () => {
    return getInstalledDetectionMethod()
  })

  ipcMain.handle(IPC_CHANNELS.RESET_PET, () => {
    const state = resetPet()
    pushStateToRenderers(state)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.UNINSTALL_DAEMON, () => {
    try {
      uninstallFartDaemon()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.MUTE_FART, (_event, durationMs: number) => {
    muteForDuration(durationMs)
    return true
  })

  // Step 9.3: Login item IPC handlers
  ipcMain.handle(IPC_CHANNELS.GET_LOGIN_ITEM, () => {
    return settingsStore.get('startOnLogin')
  })

  ipcMain.handle(IPC_CHANNELS.SET_LOGIN_ITEM, (_event, enabled: boolean) => {
    settingsStore.set('startOnLogin', enabled)
    app.setLoginItemSettings({ openAtLogin: enabled })
    return enabled
  })

  // Buddy config IPC handlers
  ipcMain.handle(IPC_CHANNELS.GET_BUDDY, () => {
    return claudeBridge.getBuddyConfig()
  })

  ipcMain.handle(IPC_CHANNELS.REFRESH_BUDDY, () => {
    return claudeBridge.reloadBuddyConfig()
  })

  // Wire up tick callback to push state updates to renderers
  // and check stat thresholds for speech triggers (Task 6.5)
  setOnTickCallback((state) => {
    pushStateToRenderers(state)
    claudeBridge.checkThresholds(state)
  })
}
