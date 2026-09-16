import type {
  AllData,
  BusinessSettings,
  SequenceKey,
  Sequences,
  TableName,
} from '../types'
import { DEFAULT_SEQUENCES, DEFAULT_SETTINGS } from '../types'
import type { Store } from './types'
import { buildSeedData } from '../seed'

/**
 * Local persistence adapter — keeps every record in the browser's localStorage
 * under the `jrec:v1:` namespace. Used when no Supabase credentials are
 * configured so the system is immediately usable; the Supabase adapter in
 * supabase.ts is a drop-in replacement with the exact same interface.
 */

const NS = 'jrec:v1:'
const KEYS: TableName[] = [
  'customers',
  'quotations',
  'jobs',
  'service_reports',
  'invoices',
  'payments',
  'billing_statements',
]

/** Domain data uses AllData field names; storage uses table names. */
const SEED_KEY: Record<TableName, 'customers' | 'quotations' | 'jobs' | 'service_reports' | 'invoices' | 'payments' | 'statements'> = {
  customers: 'customers',
  quotations: 'quotations',
  jobs: 'jobs',
  service_reports: 'service_reports',
  invoices: 'invoices',
  payments: 'payments',
  billing_statements: 'statements',
}

const SEQUENCE_TABLE: Record<SequenceKey, { table: TableName; field: 'number' | 'code' }> = {
  CUST: { table: 'customers', field: 'code' },
  QUO: { table: 'quotations', field: 'number' },
  JOB: { table: 'jobs', field: 'number' },
  SR: { table: 'service_reports', field: 'number' },
  INV: { table: 'invoices', field: 'number' },
  PAY: { table: 'payments', field: 'number' },
  BS: { table: 'billing_statements', field: 'number' },
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(NS + key, JSON.stringify(value))
}

function readRows<T>(table: TableName): T[] {
  return read<T[]>(table) ?? []
}

function readTable<T extends { id: string }>(table: TableName): T[] {
  return readRows<T>(table)
}

export class LocalStore implements Store {
  readonly kind = 'local' as const
  readonly label = 'This device (localStorage)'

  async init(): Promise<void> {
    if (!read('settings')) write('settings', DEFAULT_SETTINGS)
    if (!read('sequences')) write('sequences', DEFAULT_SEQUENCES)
    const seeded = read<boolean>('seeded')
    const empty = KEYS.every((k) => readTable(k).length === 0)
    if (!seeded && empty) {
      const seed = buildSeedData()
      for (const k of KEYS) write(k, (seed as Record<string, unknown>)[SEED_KEY[k]])
      write('seeded', true)
    }
  }

  async loadAll(): Promise<AllData> {
    const settings = { ...DEFAULT_SETTINGS, ...(read<BusinessSettings>('settings') ?? {}) }
    settings.sequences = { ...DEFAULT_SEQUENCES, ...(settings.sequences ?? {}) }
    return {
      customers: readTable('customers'),
      quotations: readTable('quotations'),
      jobs: readTable('jobs'),
      service_reports: readTable('service_reports'),
      invoices: readTable('invoices'),
      payments: readTable('payments'),
      statements: readTable('billing_statements'),
      settings,
    }
  }

  async insert<T extends { id: string }>(table: TableName, row: T): Promise<T> {
    const rows = readTable<T>(table)
    rows.push(row)
    write(table, rows)
    return row
  }

  async update<T extends { id: string }>(
    table: TableName,
    id: string,
    patch: Partial<T>,
  ): Promise<T> {
    const rows = readTable<T>(table)
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error(`Record not found in ${table}`)
    rows[idx] = { ...rows[idx], ...patch }
    write(table, rows)
    return rows[idx]
  }

  async remove(table: TableName, id: string): Promise<void> {
    const rows = readTable<{ id: string }>(table)
    write(
      table,
      rows.filter((r) => r.id !== id),
    )
  }

  async nextNumber(key: SequenceKey): Promise<string> {
    const seqs = { ...DEFAULT_SEQUENCES, ...(read<Sequences>('sequences') ?? {}) }
    const seq = { ...(seqs[key] ?? DEFAULT_SEQUENCES[key]) }
    const used = new Set(
      readRows<{ number?: string; code?: string }>(SEQUENCE_TABLE[key].table).map(
        (r) => r[SEQUENCE_TABLE[key].field],
      ),
    )
    let n = Math.max(1, seq.next)
    // Never issue a number that already exists on a record.
    while (used.has(`${seq.prefix}-${String(n).padStart(5, '0')}`)) n += 1
    seqs[key] = { prefix: seq.prefix, next: n + 1 }
    write('sequences', seqs)
    return `${seq.prefix}-${String(n).padStart(5, '0')}`
  }

  async getSettings(): Promise<BusinessSettings> {
    return { ...DEFAULT_SETTINGS, ...(read<BusinessSettings>('settings') ?? {}) }
  }

  async saveSettings(settings: BusinessSettings): Promise<void> {
    write('settings', settings)
  }

  /** Wipes every collection (keeps settings) — used by Settings ▸ Data. */
  async clearAll(): Promise<void> {
    for (const k of KEYS) write(k, [])
    write('seeded', true)
  }

  /** Clears collections and re-loads the sample dataset. */
  async resetToSample(): Promise<void> {
    await this.clearAll()
    const seed = buildSeedData()
    for (const k of KEYS) write(k, (seed as Record<string, unknown>)[SEED_KEY[k]])
  }

  /** Bulk import (Settings ▸ Restore backup). */
  async importAll(data: Omit<AllData, 'settings'>): Promise<void> {
    for (const k of KEYS) write(k, (data as Record<string, unknown>)[SEED_KEY[k]] ?? [])
    write('seeded', true)
  }
}
