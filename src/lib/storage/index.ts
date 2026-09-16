import { LocalStore } from './local'
import { createSupabaseStore } from './supabase'
import type { Store } from './types'

let store: Store | null = null

/**
 * Returns the active data store. If Supabase credentials are configured via
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, all records live in the cloud
 * database and are shared across devices. Otherwise the system runs on a
 * durable per-device store so it works out of the box.
 *
 * NOTE: The Supabase adapter uses the database ONLY — no auth, ever.
 */
export function getStore(): Store {
  if (!store) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    store = url && key ? createSupabaseStore(url, key) : new LocalStore()
  }
  return store
}
