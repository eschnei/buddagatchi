import { BrowserWindow, screen, ipcMain, Menu, app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { openSettingsWindow } from './settings-window'
import { testFartSound } from './power-monitor'

const store = new Store<{ windowPosition: { x: number; y: number } }>()

export function createPetWindow(): BrowserWindow {
  const defaultPosition = getDefaultPosition()
  const saved = store.get('windowPosition')
  const x = saved?.x ?? defaultPosition.x
  const y = saved?.y ?? defaultPosition.y

  const win = new BrowserWindow({
    width: 200,
    height: 200,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')

  // Manual window dragging via IPC (renderer sends delta x/y)
  ipcMain.on('move-window', (_event, dx: number, dy: number) => {
    const [x, y] = win.getPosition()
    win.setPosition(x + dx, y + dy)
  })

  // Click-through: disabled for now so the pet is reliably clickable.
  // The 200x200 window is small enough that blocking clicks isn't a problem.
  // TODO: Re-enable with proper mouse tracking if needed:
  //   win.setIgnoreMouseEvents(true, { forward: true })
  //   ipcMain.on('mouse-enter-sprite', () => win.setIgnoreMouseEvents(false))
  //   ipcMain.on('mouse-leave-sprite', () => win.setIgnoreMouseEvents(true, { forward: true }))

  // IPC: show context menu
  ipcMain.on('show-context-menu', () => {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Feed',
        click: (): void => {
          console.log('Feed clicked')
        }
      },
      {
        label: 'Pet',
        click: (): void => {
          console.log('Pet clicked')
        }
      },
      {
        label: 'Talk',
        click: (): void => {
          console.log('Talk clicked')
        }
      },
      {
        label: 'Dance',
        click: (): void => {
          win.webContents.send('pet:dance')
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: (): void => {
          openSettingsWindow()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: (): void => {
          app.quit()
        }
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })

  // Persist window position on move
  win.on('move', () => {
    const [posX, posY] = win.getPosition()
    store.set('windowPosition', { x: posX, y: posY })
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function getDefaultPosition(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - 200 - 20,
    y: workArea.y + workArea.height - 200 - 20
  }
}
