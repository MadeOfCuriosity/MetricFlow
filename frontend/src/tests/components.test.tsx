import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Skeleton, KPICardSkeleton, DashboardSkeleton } from '../components/Skeleton'

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child throws', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ThrowingComponent() {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function ThrowingComponent() {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})

describe('Skeleton Components', () => {
  it('renders basic Skeleton', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const skeleton = container.querySelector('.skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('h-4', 'w-20')
  })

  it('renders KPICardSkeleton', () => {
    const { container } = render(<KPICardSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders DashboardSkeleton with multiple sections', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    // Dashboard should have many skeleton elements
    expect(skeletons.length).toBeGreaterThan(10)
  })
})

describe('InsightCard', () => {
  // Note: InsightCard requires specific props, so we test it here
  it('is exportable from components', async () => {
    const { InsightCard } = await import('../components/InsightCard')
    expect(InsightCard).toBeDefined()
  })
})

describe('KPICard', () => {
  it('is exportable from components', async () => {
    const { KPICard } = await import('../components/KPICard')
    expect(KPICard).toBeDefined()
  })
})
