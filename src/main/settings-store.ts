import Store from 'electron-store'

export interface SettingsData {
  apiKey: string
  fartVolume: number
  fartEnabled: boolean
  startOnLogin: boolean
  petColor: string
  petHat: string
}

export const settingsStore = new Store<SettingsData>({
  name: 'settings',
  encryptionKey: 'desktop-buddy-settings-v1',
  defaults: {
    apiKey: '',
    fartVolume: 50,
    fartEnabled: true,
    startOnLogin: true,
    petColor: '#4ADE80',
    petHat: ''
  }
})
