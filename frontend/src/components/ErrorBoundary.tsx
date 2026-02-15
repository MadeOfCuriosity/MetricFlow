import { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-danger-500/10 rounded-full flex items-center justify-center mb-6">
              <ExclamationTriangleIcon className="w-8 h-8 text-danger-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-dark-300 mb-6">
              An unexpected error occurred. Please try again or contact support if the
              problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-dark-900 rounded-lg text-left">
                <p className="text-sm font-mono text-danger-400 break-all">
                  {typeof this.state.error.message === 'string'
                    ? this.state.error.message
                    : JSON.stringify(this.state.error.message, null, 2)}
                </p>
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
