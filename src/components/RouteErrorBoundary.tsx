import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="error-state">
          <h2>This section failed to load</h2>
          <p>Refresh the page or try again in a moment.</p>
        </section>
      )
    }

    return this.props.children
  }
}
