import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog } from '@headlessui/react'
import { Modal } from '../components/ui/Modal'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { SearchInput } from '../components/ui/SearchInput'
import { StatChip } from '../components/ui/StatChip'
import { Spinner } from '../components/ui/Spinner'

describe('Modal', () => {
  it('renders its content only when open', () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <Dialog.Title>Hello</Dialog.Title>
      </Modal>
    )
    expect(screen.queryByText('Hello')).toBeNull()
    rerender(
      <Modal isOpen onClose={() => {}}>
        <Dialog.Title>Hello</Dialog.Title>
      </Modal>
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        <Dialog.Title>Hello</Dialog.Title>
        <button>focusable</button>
      </Modal>
    )
    fireEvent.keyDown(screen.getByText('focusable'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('uses the given panel classes instead of the default', () => {
    render(
      <Modal isOpen onClose={() => {}} className="custom-panel">
        <Dialog.Title>Hello</Dialog.Title>
      </Modal>
    )
    const panel = screen.getByText('Hello').parentElement!
    expect(panel).toHaveClass('custom-panel')
    expect(panel).not.toHaveClass('max-w-md')
  })
})

describe('SegmentedControl', () => {
  it('marks the selected option and reports changes', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    )
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'false')
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('SearchInput', () => {
  it('passes the typed value to onChange', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="Search rooms..." />)
    fireEvent.change(screen.getByPlaceholderText('Search rooms...'), { target: { value: 'fin' } })
    expect(onChange).toHaveBeenCalledWith('fin')
  })
})

describe('StatChip', () => {
  it('renders label, value and hint', () => {
    render(<StatChip label="Departments" value={4} hint="(Top-level)" />)
    expect(screen.getByText('Departments:')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('(Top-level)')).toBeInTheDocument()
  })
})

describe('Spinner', () => {
  it('is announced as loading', () => {
    render(<Spinner size="xl" />)
    expect(screen.getByRole('status', { name: 'Loading' })).toHaveClass('h-12', 'w-12')
  })
})
