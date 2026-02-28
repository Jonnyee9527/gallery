import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Directory, CustomField } from '../../../shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const nfoDirectories = ref<Directory[]>([])
  const videoDirectories = ref<Directory[]>([])
  const customFields = ref<CustomField[]>([])
  const externalPlayerPath = ref<string>('')

  async function fetchDirectories(): Promise<void> {
    nfoDirectories.value = await window.api.getDirectories('nfo')
    videoDirectories.value = await window.api.getDirectories('video')
  }

  async function fetchCustomFields(): Promise<void> {
    customFields.value = await window.api.getCustomFields()
  }

  async function fetchPlayerPath(): Promise<void> {
    externalPlayerPath.value = (await window.api.getSetting('externalPlayerPath')) || ''
  }

  async function fetchAll(): Promise<void> {
    await Promise.all([fetchDirectories(), fetchCustomFields(), fetchPlayerPath()])
  }

  return {
    nfoDirectories,
    videoDirectories,
    customFields,
    externalPlayerPath,
    fetchDirectories,
    fetchCustomFields,
    fetchPlayerPath,
    fetchAll
  }
})
