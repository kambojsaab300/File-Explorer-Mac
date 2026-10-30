import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const file = (): string => join(app.getPath('userData'), 'settings.json')

let cache: Record<string, unknown> | null = null
let pending: Promise<void> = Promise.resolve()

function load(): Record<string, unknown> {
  if (cache) return cache
  try {
    cache = JSON.parse(readFileSync(file(), 'utf8'))
  } catch {
    cache = {}
  }
  return cache!
}

export function getSetting<T>(key: string): T | undefined {
  return load()[key] as T | undefined
}

export function setSetting<T>(key: string, value: T): Promise<void> {
  load()[key] = value
  // Writes are chained and go through a temp file so a crash never leaves half a JSON.
  pending = pending.then(async () => {
    const tmp = file() + '.tmp'
    await writeFile(tmp, JSON.stringify(cache, null, 2))
    await rename(tmp, file())
  })
  return pending
}
