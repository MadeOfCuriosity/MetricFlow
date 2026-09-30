import type { AggregationType, Integration, ZohoBooksModule, ZohoBooksPreviewRow } from '../../types/integration'

export type GlKind = 'income' | 'expense'
export type ZohoAggregation = Exclude<AggregationType, 'direct'>

export interface ZohoSource {
  id: ZohoBooksModule
  name: string
  /** Lowercase plural used in copy: "Number of invoices" */
  noun: string
  description: string
  /** Per-department sources pick Chart of Accounts entries */
  gl?: GlKind
  /** Hidden behind "Show more" */
  more?: boolean
}

export const ZOHO_SOURCES: ZohoSource[] = [
  { id: 'invoices', name: 'Invoices', noun: 'invoices', description: 'Invoice totals and counts, by invoice date' },
  { id: 'payments_received', name: 'Payments received', noun: 'payments', description: 'Money collected from customers' },
  { id: 'expenses', name: 'Expenses', noun: 'expenses', description: 'Recorded expenses, by date' },
  { id: 'bills', name: 'Bills', noun: 'bills', description: 'Vendor bills, by bill date' },
  { id: 'gl_revenue', name: 'Revenue by GL account', noun: 'invoice lines', description: 'Invoice lines posted to an income account', gl: 'income' },
  { id: 'gl_expense', name: 'Cost by GL account', noun: 'journal lines', description: 'Journal debits to an expense account, e.g. salaries', gl: 'expense' },
  { id: 'payments_made', name: 'Payments made', noun: 'payments', description: 'Money paid to vendors', more: true },
  { id: 'credit_notes', name: 'Credit notes', noun: 'credit notes', description: 'Credits issued to customers', more: true },
  { id: 'sales_orders', name: 'Sales orders', noun: 'sales orders', description: 'Confirmed orders, by order date', more: true },
  { id: 'purchase_orders', name: 'Purchase orders', noun: 'purchase orders', description: 'Orders placed with vendors', more: true },
]

export const sourceById = (id: string) => ZOHO_SOURCES.find(s => s.id === id)

export const AGGREGATIONS: { value: ZohoAggregation; label: string }[] = [
  { value: 'sum', label: 'Add up per day' },
  { value: 'count', label: 'Count per day' },
  { value: 'avg', label: 'Average per day' },
  { value: 'max', label: 'Highest per day' },
  { value: 'min', label: 'Lowest per day' },
]
/** GL sources only pre-compute sums and counts (see zoho_books.py) */
export const GL_AGGREGATIONS = AGGREGATIONS.filter(a => a.value === 'sum' || a.value === 'count')

export interface Preset {
  field: string
  aggregation: ZohoAggregation
  /** Name of the data field to save to (matched to an existing field by name) */
  target: string
  on: boolean
}

/** Likely values for each source, pre-ticked where most people want them */
export function presetsFor(module: ZohoBooksModule, accountName?: string): Preset[] {
  const acct = accountName || 'Account'
  switch (module) {
    case 'invoices': return [
      { field: 'total', aggregation: 'sum', target: 'Revenue', on: true },
      { field: 'total', aggregation: 'count', target: 'Invoices Raised', on: true },
      { field: 'balance', aggregation: 'sum', target: 'Receivables', on: false },
    ]
    case 'payments_received': return [
      { field: 'amount', aggregation: 'sum', target: 'Collections', on: true },
      { field: 'amount', aggregation: 'count', target: 'Payments Received Count', on: false },
    ]
    case 'expenses': return [
      { field: 'total', aggregation: 'sum', target: 'Expenses', on: true },
      { field: 'total', aggregation: 'count', target: 'Expense Count', on: false },
    ]
    case 'bills': return [
      { field: 'total', aggregation: 'sum', target: 'Bills', on: true },
      { field: 'balance', aggregation: 'sum', target: 'Payables', on: false },
    ]
    case 'payments_made': return [
      { field: 'amount', aggregation: 'sum', target: 'Payments Made', on: true },
    ]
    case 'credit_notes': return [
      { field: 'total', aggregation: 'sum', target: 'Credit Notes', on: true },
    ]
    case 'sales_orders': return [
      { field: 'total', aggregation: 'sum', target: 'Sales Orders', on: true },
      { field: 'total', aggregation: 'count', target: 'Sales Orders Count', on: false },
    ]
    case 'purchase_orders': return [
      { field: 'total', aggregation: 'sum', target: 'Purchase Orders', on: true },
    ]
    case 'gl_revenue': return [
      { field: 'item_total', aggregation: 'sum', target: `${acct} Revenue`, on: true },
      { field: 'quantity', aggregation: 'sum', target: `${acct} Units`, on: false },
    ]
    case 'gl_expense': return [
      { field: 'amount', aggregation: 'sum', target: acct, on: true },
    ]
  }
}

const FIELD_LABELS: Record<string, string> = {
  total: 'Total',
  sub_total: 'Sub total',
  tax_total: 'Tax total',
  balance: 'Balance due',
  amount: 'Amount',
  unused_amount: 'Unapplied amount',
  bank_charges: 'Bank charges',
  total_without_tax: 'Total before tax',
  bcy_total: 'Total (base currency)',
  bcy_total_without_tax: 'Total before tax (base currency)',
  bcy_amount: 'Amount (base currency)',
  item_total: 'Line total',
  quantity: 'Quantity',
  write_off_amount: 'Written off',
  discount_total: 'Discount',
  shipping_charge: 'Shipping charges',
  adjustment: 'Adjustment',
}

export function fieldLabel(name: string, fallback?: string) {
  if (FIELD_LABELS[name]) return FIELD_LABELS[name]
  if (fallback && fallback !== name) return fallback
  const words = name.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** What a mapping row is called, e.g. "Invoice total" or "Number of invoices" */
export function valueLabel(module: ZohoBooksModule, field: string, aggregation: ZohoAggregation, fallback?: string) {
  const src = sourceById(module)
  if (aggregation === 'count') return `Number of ${src?.noun ?? 'records'}`
  return fieldLabel(field, fallback)
}

export function sourceName(module: ZohoBooksModule, accountName?: string) {
  if (module === 'gl_revenue') return `Revenue · ${accountName ?? ''}`
  if (module === 'gl_expense') return `Cost · ${accountName ?? ''}`
  return sourceById(module)?.name ?? module
}

/** Matches existing rows: "Zoho Books — Invoices", "Zoho Books — SMM Sales" */
export const displayNameFor = (module: ZohoBooksModule, accountName?: string) =>
  `Zoho Books — ${accountName && sourceById(module)?.gl ? accountName : sourceName(module)}`

/** Same identity the backend uses to stop a source being added twice */
export function sourceKey(orgId: string, branchId: string, module: string, glAccountId = '') {
  return [orgId, branchId, module, glAccountId].join('|')
}

export function integrationSourceKey(i: Integration) {
  const c = (i.config || {}) as Record<string, unknown>
  return sourceKey(String(c.zoho_org_id ?? ''), String(c.branch_id ?? ''), String(c.module ?? ''), String(c.gl_account_id ?? ''))
}

/** A Zoho Books row that holds a sign-in but has no source chosen yet */
export const isSetupIncomplete = (i: Integration) =>
  i.provider === 'zoho_books' && !(i.config as Record<string, unknown> | undefined)?.module

/** The value a mapping would sync for one preview day (mirrors SyncService._extract_value) */
export function previewValue(row: ZohoBooksPreviewRow | undefined, field: string, aggregation: ZohoAggregation) {
  if (!row) return null
  const v = aggregation === 'count' ? row.__record_count : row[`${field}__${aggregation}`]
  return typeof v === 'number' ? v : null
}
