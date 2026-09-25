import { describe, it, expect, vi } from 'vitest'
import { renderHook, fireEvent } from '@testing-library/react'
import { getApiError } from '../lib/apiError'
import { useDismiss } from '../hooks/useDismiss'
import { formatCompactNumber, formatTimeAgo } from '../lib/format'

const axiosErr = (detail: unknown, message = 'Request failed with status code 400') => ({
  message,
  response: { data: { detail } },
})

describe('getApiError', () => {
  it('returns a string detail', () => {
    expect(getApiError(axiosErr('Room name already exists'), 'fallback')).toBe('Room name already exists')
  })

  it('joins FastAPI validation error arrays', () => {
    const detail = [
      { loc: ['body', 'name'], msg: 'field required', type: 'missing' },
      { loc: ['body', 'color'], msg: 'invalid hex', type: 'value_error' },
    ]
    expect(getApiError(axiosErr(detail), 'fallback')).toBe('field required, invalid hex')
  })

  it('reads msg from an object detail', () => {
    expect(getApiError(axiosErr({ msg: 'Quota exceeded' }), 'fallback')).toBe('Quota exceeded')
  })

  it('uses the fallback when there is no detail, ignoring the axios message by default', () => {
    expect(getApiError(axiosErr(undefined), 'Failed to save')).toBe('Failed to save')
    expect(getApiError(axiosErr(''), 'Failed to save')).toBe('Failed to save')
    expect(getApiError(null, 'Failed to save')).toBe('Failed to save')
  })

  it('falls back to the error message only when includeMessage is set', () => {
    expect(getApiError(new Error('Network Error'), 'fallback')).toBe('fallback')
    expect(getApiError(new Error('Network Error'), 'fallback', { includeMessage: true })).toBe('Network Error')
  })

  it('passes string errors through', () => {
    expect(getApiError('plain failure', 'fallback')).toBe('plain failure')
  })
})

describe('useDismiss', () => {
  function setup(options?: { enabled?: boolean; escape?: boolean }) {
    const inside = document.createElement('div')
    const outside = document.createElement('div')
    document.body.append(inside, outside)
    const onDismiss = vi.fn()
    const ref = { current: inside }
    const hook = renderHook(({ opts }) => useDismiss([ref], onDismiss, opts), { initialProps: { opts: options } })
    return { inside, outside, onDismiss, hook }
  }

  it('dismisses on mousedown outside but not inside', () => {
    const { inside, outside, onDismiss } = setup()
    fireEvent.mouseDown(inside)
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.mouseDown(outside)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does nothing while disabled', () => {
    const { outside, onDismiss } = setup({ enabled: false })
    fireEvent.mouseDown(outside)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('handles Escape only when enabled', () => {
    const a = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(a.onDismiss).not.toHaveBeenCalled()
    a.hook.unmount()
    const b = setup({ escape: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(b.onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('formatCompactNumber', () => {
  it('abbreviates millions and tens of thousands', () => {
    expect(formatCompactNumber(2_500_000)).toBe('2.5M')
    expect(formatCompactNumber(-1_000_000)).toBe('-1.0M')
    expect(formatCompactNumber(12_345)).toBe('12.3k')
  })
  it('formats smaller values with the given options', () => {
    expect(formatCompactNumber(1234.567, { maximumFractionDigits: 2 })).toBe((1234.567).toLocaleString(undefined, { maximumFractionDigits: 2 }))
    expect(formatCompactNumber(9999)).toBe((9999).toLocaleString())
  })
})

describe('formatTimeAgo', () => {
  const now = new Date('2026-09-25T12:00:00Z')
  const ago = (mins: number) => new Date(now.getTime() - mins * 60000)
  it('steps through minutes, hours and days', () => {
    expect(formatTimeAgo(ago(0), { now })).toBe('just now')
    expect(formatTimeAgo(ago(5), { now })).toBe('5m ago')
    expect(formatTimeAgo(ago(180), { now })).toBe('3h ago')
    expect(formatTimeAgo(ago(1500), { now })).toBe('yesterday')
    expect(formatTimeAgo(ago(4 * 1440), { now })).toBe('4d ago')
  })
  it('respects options', () => {
    expect(formatTimeAgo(ago(0), { now, justNow: 'Just now' })).toBe('Just now')
    expect(formatTimeAgo(ago(1500), { now, yesterday: false })).toBe('1d ago')
    expect(formatTimeAgo(ago(10 * 1440), { now, dateAfterDays: 7 })).toBe('Sep 15')
  })
  it('accepts ISO strings', () => {
    expect(formatTimeAgo(ago(5).toISOString(), { now })).toBe('5m ago')
  })
})
