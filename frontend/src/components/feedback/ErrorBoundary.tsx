import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application rendering error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen">
          <CircleAlert size={32} />
          <h1>Something went wrong</h1>
          <p>Reload the page to continue.</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Reload page
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
