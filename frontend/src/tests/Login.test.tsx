import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { Login } from '../pages/Login'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: vi.fn(),
      get: vi.fn(),
    }),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows link to register page', () => {
    renderLogin()

    const registerLink = screen.getByRole('link', { name: /create one/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('allows entering email and password', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('shows validation for empty fields on submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // HTML5 validation should prevent submission with empty required fields
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    expect(emailInput.validity.valueMissing).toBe(true)
  })

  it('displays MetricFlow branding', () => {
    renderLogin()

    expect(screen.getByText('MetricFlow')).toBeInTheDocument()
  })

  it('has password field with correct type', () => {
    renderLogin()

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has email field with correct type', () => {
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
  })
})
