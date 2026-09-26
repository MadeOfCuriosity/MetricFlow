import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DataField } from '../types/dataField'

vi.mock('../context/RoomContext', () => ({
  useRoom: () => ({ rooms: [], roomTree: [] }),
}))

import { FormulaInput } from '../components/kpi-studio/FormulaInput'

const field = (over: Partial<DataField>): DataField => ({
  id: over.variable_name ?? 'id',
  org_id: 'org',
  room_ids: [],
  room_names: [],
  room_paths: [],
  name: 'Field',
  variable_name: 'field',
  description: null,
  unit: null,
  entry_interval: 'daily',
  created_by: null,
  created_at: '2026-01-01',
  kpi_count: 0,
  latest_value: null,
  latest_date: null,
  ...over,
})

const FIELDS = [
  field({ id: '1', name: 'Total Revenue', variable_name: 'total_revenue', unit: '$', latest_value: 200 }),
  field({ id: '2', name: 'Total Expenses', variable_name: 'total_expenses', latest_value: 50 }),
]

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <FormulaInput value={value} onChange={setValue} dataFields={FIELDS} onFieldCreated={() => {}} />
      <output data-testid="value">{value}</output>
    </>
  )
}

describe('FormulaInput', () => {
  it('suggests data fields while typing and inserts the variable on Enter', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('combobox')

    await user.type(input, 'reven')
    expect(screen.getByRole('option', { name: /Total Revenue/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Create new data field "Reven"/ })).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('value')).toHaveTextContent('total_revenue')
  })

  it('shows how variables resolve and previews the result', () => {
    render(<Harness initial="(total_revenue - total_expenses) / total_revenue * 100" />)
    expect(screen.getByText(/2\/2 linked to data fields/)).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('flags unknown variables as new fields and offers close matches', async () => {
    const user = userEvent.setup()
    render(<Harness initial="total_revenu / 2" />)
    expect(screen.getByText(/New field "Total Revenu" will be created/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Use "Total Revenue" instead/ }))
    expect(screen.getByTestId('value')).toHaveTextContent('total_revenue / 2')
  })

  it('explains syntax errors once the input loses focus', () => {
    render(<Harness initial="total_revenue +" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Add a value after "+"')
  })
})
