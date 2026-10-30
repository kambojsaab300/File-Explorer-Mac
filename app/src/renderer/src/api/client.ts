import type { KhojAPI } from '@shared/types'
import { mockApi } from './mock'

// Inside Electron the preload provides the real API; in a plain browser we fall back to the mock.
export const api: KhojAPI = window.khoj?.fs ? window.khoj : mockApi
export const isMock = api === mockApi
