import { browser } from '$app/environment'
import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'
import memoryDriver from 'unstorage/drivers/memory'

/**
 * App-wide key–value storage.
 * Browser: backed by localStorage (prefix "cinetracker:").
 * SSR:     in-memory (values are not persisted and not needed server-side).
 */
export const storage = createStorage({
  driver: browser
    ? localStorageDriver({ base: 'cinetracker:' })
    : memoryDriver(),
})

export const getStorageItem = <T>(key: string, fallback: T): Promise<T> =>
  storage.getItem<T>(key).then((v) => v ?? fallback)

export const setStorageItem = <T>(key: string, value: T): Promise<void> =>
  storage.setItem(key, value)
