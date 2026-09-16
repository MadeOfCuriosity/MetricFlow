import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { Login } from '../pages/Login'

// Mock @react-oauth/google
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login">Google Login</div>,
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGoogleOAuth: () => ({ clientId: 'test' }),
}))

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
      <ThemeProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('shows link / button to request invite', () => {
    renderLogin()

    const inviteBtn = screen.getByRole('button', { name: /request invite/i })
    expect(inviteBtn).toBeInTheDocument()
  })

  it('allows entering email and password', async () => {
    const user = userEvent.setup()
    renderLogin()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)

    await user.clear(emailInput)
    await user.type(emailInput, 'test@example.com')
    await user.clear(passwordInput)
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('displays Visualize branding', () => {
    renderLogin()

    const logos = screen.getAllByAltText('Visualize')
    expect(logos.length).toBeGreaterThan(0)
  })

  it('has password field with correct type', () => {
    renderLogin()

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has email field with correct type', () => {
    renderLogin()

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toHaveAttribute('type', 'email')
  })
})
