import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Step 2: Mouse & context menu
  mouseEnterSprite: (): void => {
    ipcRenderer.send('mouse-enter-sprite')
  },
  mouseLeaveSprite: (): void => {
    ipcRenderer.send('mouse-leave-sprite')
  },
  showContextMenu: (): void => {
    ipcRenderer.send('show-context-menu')
  },

  // Step 3: Pet state
  getState: (): Promise<unknown> => {
    return ipcRenderer.invoke('pet:get-state')
  },
  feedPet: (): Promise<unknown> => {
    return ipcRenderer.invoke('pet:feed')
  },
  petPet: (): Promise<unknown> => {
    return ipcRenderer.invoke('pet:pet')
  },
  onStateUpdate: (callback: (state: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown): void => {
      callback(state)
    }
    ipcRenderer.on('pet:state-update', handler)
    return (): void => {
      ipcRenderer.removeListener('pet:state-update', handler)
    }
  },

  // Step 6: Claude bridge
  talk: (): Promise<unknown> => {
    return ipcRenderer.invoke('pet:talk')
  },
  onSpeech: (callback: (text: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string): void => {
      callback(text)
    }
    ipcRenderer.on('pet:speech', handler)
    return (): void => {
      ipcRenderer.removeListener('pet:speech', handler)
    }
  },
  resizeWindow: (width: number, height: number): void => {
    ipcRenderer.send('pet:resize-window', width, height)
  },

  // Step 8: Settings
  getSettings: (): Promise<unknown> => {
    return ipcRenderer.invoke('settings:get')
  },
  saveSettings: (settings: Record<string, unknown>): Promise<unknown> => {
    return ipcRenderer.invoke('settings:save', settings)
  },
  getDaemonMethod: (): Promise<unknown> => {
    return ipcRenderer.invoke('settings:get-daemon-method')
  },
  resetPet: (): Promise<unknown> => {
    return ipcRenderer.invoke('settings:reset-pet')
  },
  uninstallDaemon: (): Promise<unknown> => {
    return ipcRenderer.invoke('settings:uninstall-daemon')
  },
  muteFart: (durationMs: number): Promise<unknown> => {
    return ipcRenderer.invoke('settings:mute-fart', durationMs)
  },

  // Step 9: Login item
  getLoginItem: (): Promise<unknown> => {
    return ipcRenderer.invoke('settings:get-login-item')
  },
  setLoginItem: (enabled: boolean): Promise<unknown> => {
    return ipcRenderer.invoke('settings:set-login-item', enabled)
  },

  // Buddy config
  getBuddy: (): Promise<unknown> => {
    return ipcRenderer.invoke('buddy:get')
  },
  refreshBuddy: (): Promise<unknown> => {
    return ipcRenderer.invoke('buddy:refresh')
  },

  // Window drag
  moveWindow: (dx: number, dy: number): void => {
    ipcRenderer.send('move-window', dx, dy)
  },

  // Dance
  onDance: (callback: () => void): (() => void) => {
    const handler = (): void => { callback() }
    ipcRenderer.on('pet:dance', handler)
    return (): void => { ipcRenderer.removeListener('pet:dance', handler) }
  }
})
