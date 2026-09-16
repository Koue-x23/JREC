import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AllData,
  BusinessSettings,
  Customer,
  Invoice,
  Job,
  LineItem,
  Payment,
  Quotation,
  SequenceKey,
  ServiceReport,
  BillingStatement,
  TableName,
} from '../types'
import { DEFAULT_SEQUENCES, DEFAULT_SETTINGS } from '../types'
import type { Store, TableMap } from './types'
import { buildSeedData } from '../seed'

/**
 * Supabase cloud adapter — pure database, NO authentication.
 * The anon key is used only for data access (see supabase/schema.sql);
 * there are no user accounts by design.
 *
 * Tables: customers, quotations, quotation_items, jobs, service_reports,
 * invoices, invoice_items, payments, billing_statements, document_sequences,
 * business_settings.
 */

const DOC_TABLE: Record<SequenceKey, string> = {
  CUST: 'customers',
  QUO: 'quotations',
  JOB: 'jobs',
  SR: 'service_reports',
  INV: 'invoices',
  PAY: 'payments',
  BS: 'billing_statements',
}

export function createSupabaseStore(url: string, anonKey: string): Store {
  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const upsertItems = async (
    table: 'quotation_items' | 'invoice_items',
    parentId: string,
    items: LineItem[],
  ) => {
    const fk = table === 'quotation_items' ? 'quotation_id' : 'invoice_id'
    const { error: delErr } = await client.from(table).delete().eq(fk, parentId)
    if (delErr) throw new Error(delErr.message)
    if (items.length === 0) return
    const rows = items.map((it, i) => ({
      id: it.id,
      [fk]: parentId,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      sort_index: i,
    }))
    const { error } = await client.from(table).insert(rows)
    if (error) throw new Error(error.message)
  }

  const stripItems = (row: Record<string, unknown>): Record<string, unknown> => {
    const copy = { ...row }
    delete copy.items
    return copy
  }

  return {
    kind: 'supabase',
    label: 'Supabase cloud database',

    async init() {
      // Ensure the single settings row exists.
      const { data: s } = await client.from('business_settings').select('id').eq('id', 1).maybeSingle()
      if (!s) {
        await client.from('business_settings').insert({ id: 1, ...DEFAULT_SETTINGS })
      }
      // Ensure sequence rows exist.
      const keys = Object.keys(DOC_TABLE) as SequenceKey[]
      const { error } = await client
        .from('document_sequences')
        .upsert(
          keys.map((k) => ({
            doc_type: k,
            prefix: DEFAULT_SEQUENCES[k].prefix,
            next_number: DEFAULT_SEQUENCES[k].next,
          })),
          { onConflict: 'doc_type' },
        )
      if (error) throw new Error(error.message)
    },

    async loadAll(): Promise<AllData> {
      const [cust, quo, jobRows, sr, inv, pay, stmts, settingsRow] = await Promise.all([
        client.from('customers').select('*').order('created_at'),
        client.from('quotations').select('*, quotation_items(*)').order('created_at'),
        client.from('jobs').select('*').order('created_at'),
        client.from('service_reports').select('*').order('created_at'),
        client.from('invoices').select('*, invoice_items(*)').order('created_at'),
        client.from('payments').select('*').order('created_at'),
        client.from('billing_statements').select('*').order('created_at'),
        client.from('business_settings').select('*').eq('id', 1).maybeSingle(),
      ])

      const err =
        cust.error || quo.error || jobRows.error || sr.error || inv.error || pay.error ||
        stmts.error || settingsRow.error
      if (err) throw new Error(err.message)

      const sortItems = (rows: { sort_index: number }[]) =>
        rows
          .slice()
          .sort((a, b) => a.sort_index - b.sort_index)
          .map(({ sort_index: _s, ...it }) => it as unknown as LineItem)

      const rawSettings = settingsRow.data as (Partial<BusinessSettings> & { sequences?: object }) | null
      const settings: BusinessSettings = rawSettings
        ? {
            ...DEFAULT_SETTINGS,
            ...rawSettings,
            sequences: { ...DEFAULT_SEQUENCES, ...(rawSettings.sequences ?? {}) },
          }
        : DEFAULT_SETTINGS

      return {
        customers: (cust.data ?? []) as Customer[],
        quotations: (quo.data ?? []).map((q) => ({
          ...q,
          items: sortItems((q.quotation_items ?? []) as { sort_index: number }[]),
        })) as Quotation[],
        jobs: (jobRows.data ?? []) as Job[],
        service_reports: (sr.data ?? []) as ServiceReport[],
        invoices: (inv.data ?? []).map((v) => ({
          ...v,
          items: sortItems((v.invoice_items ?? []) as { sort_index: number }[]),
        })) as Invoice[],
        payments: (pay.data ?? []) as Payment[],
        statements: (stmts.data ?? []) as BillingStatement[],
        settings,
      }
    },

    async insert<T extends TableName>(table: T, row: TableMap[T]): Promise<TableMap[T]> {
      if (table === 'quotations' || table === 'invoices') {
        const rowObj = row as unknown as Record<string, unknown>
        const items = (rowObj.items ?? []) as LineItem[]
        const { error } = await client.from(table).insert(stripItems(rowObj))
        if (error) throw new Error(error.message)
        await upsertItems(
          table === 'quotations' ? 'quotation_items' : 'invoice_items',
          row.id,
          items,
        )
        return row
      }
      const { error } = await client.from(table).insert(row as unknown as Record<string, unknown>)
      if (error) throw new Error(error.message)
      return row
    },

    async update<T extends TableName>(
      table: T,
      id: string,
      patch: Partial<TableMap[T]>,
    ): Promise<TableMap[T]> {
      if (table === 'quotations' || table === 'invoices') {
        const patchObj = { ...(patch as Record<string, unknown>) }
        const items = patchObj.items as LineItem[] | undefined
        delete patchObj.items
        const { data, error } = await client
          .from(table)
          .update(patchObj)
          .eq('id', id)
          .select()
          .single()
        if (error) throw new Error(error.message)
        if (items) {
          await upsertItems(table === 'quotations' ? 'quotation_items' : 'invoice_items', id, items)
        }
        return data as TableMap[T]
      }
      const { data, error } = await client
        .from(table)
        .update(patch as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as TableMap[T]
    },

    async remove(table: TableName, id: string) {
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    async nextNumber(key: SequenceKey): Promise<string> {
      // Preferred path: atomic Postgres function (see supabase/schema.sql).
      const { data, error } = await client.rpc('next_doc_number', { p_doc_type: key })
      if (!error && typeof data === 'string') return data

      // Fallback: guarded optimistic update (function not installed).
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: seq } = await client
          .from('document_sequences')
          .select('*')
          .eq('doc_type', key)
          .maybeSingle()
        if (!seq) continue
        const { data: upd } = await client
          .from('document_sequences')
          .update({ next_number: seq.next_number + 1 })
          .eq('doc_type', key)
          .eq('next_number', seq.next_number)
          .select()
          .maybeSingle()
        if (upd) return `${seq.prefix}-${String(seq.next_number).padStart(5, '0')}`
      }
      throw new Error('Could not allocate the next document number. Please try again.')
    },

    async getSettings(): Promise<BusinessSettings> {
      const { data } = await client.from('business_settings').select('*').eq('id', 1).maybeSingle()
      if (!data) return DEFAULT_SETTINGS
      const raw = data as Partial<BusinessSettings> & { sequences?: object }
      return {
        ...DEFAULT_SETTINGS,
        ...raw,
        sequences: { ...DEFAULT_SEQUENCES, ...(raw.sequences ?? {}) },
      }
    },

    async saveSettings(settings: BusinessSettings) {
      const { error } = await client.from('business_settings').upsert({ id: 1, ...settings })
      if (error) throw new Error(error.message)
    },

    async clearAll() {
      const tables = [
        'payments',
        'invoice_items',
        'invoices',
        'quotation_items',
        'quotations',
        'service_reports',
        'jobs',
        'billing_statements',
        'customers',
      ]
      for (const t of tables) {
        const { error } = await client
          .from(t)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
        if (error) throw new Error(error.message)
      }
      const keys = Object.keys(DOC_TABLE) as SequenceKey[]
      const { error } = await client.from('document_sequences').upsert(
        keys.map((k) => ({
          doc_type: k,
          prefix: DEFAULT_SEQUENCES[k].prefix,
          next_number: DEFAULT_SEQUENCES[k].next,
        })),
        { onConflict: 'doc_type' },
      )
      if (error) throw new Error(error.message)
    },

    async resetToSample() {
      await this.clearAll()
      await this.importAll(buildSeedData())
    },

    async importAll(seed: Omit<AllData, 'settings'>) {
      for (const c of seed.customers) await client.from('customers').insert(c)
      for (const q of seed.quotations) {
        const { items, ...row } = q
        await client.from('quotations').insert(row)
        if (items.length) {
          const { error } = await client.from('quotation_items').insert(
            items.map((it, i) => ({
              id: it.id,
              quotation_id: q.id,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              sort_index: i,
            })),
          )
          if (error) throw new Error(error.message)
        }
      }
      for (const j of seed.jobs) await client.from('jobs').insert(j)
      for (const s of seed.service_reports) await client.from('service_reports').insert(s)
      for (const v of seed.invoices) {
        const { items, ...row } = v
        await client.from('invoices').insert(row)
        if (items.length) {
          const { error } = await client.from('invoice_items').insert(
            items.map((it, i) => ({
              id: it.id,
              invoice_id: v.id,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unit_price: it.unit_price,
              sort_index: i,
            })),
          )
          if (error) throw new Error(error.message)
        }
      }
      for (const p of seed.payments) await client.from('payments').insert(p)
      for (const b of seed.statements) await client.from('billing_statements').insert(b)
      // Push sequences past the highest seeded number.
      const bumps: Record<string, number> = {
        CUST: 7, QUO: 12, JOB: 6, SR: 6, INV: 9, PAY: 9, BS: 3,
      }
      const keys = Object.keys(DOC_TABLE) as SequenceKey[]
      const { error } = await client.from('document_sequences').upsert(
        keys.map((k) => ({
          doc_type: k,
          prefix: DEFAULT_SEQUENCES[k].prefix,
          next_number: bumps[k] ?? DEFAULT_SEQUENCES[k].next,
        })),
        { onConflict: 'doc_type' },
      )
      if (error) throw new Error(error.message)
    },
  }
}
