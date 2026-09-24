import { Component } from 'react';

// Catches unexpected render errors so users see a friendly message instead of a blank screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    // reset when the user navigates somewhere else
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-semibold text-white">Something went wrong on this page</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">Please reload. If it keeps happening, share this message with support:</p>
        <code className="mt-3 max-w-xl break-all rounded-lg bg-ink-800 px-3 py-2 text-xs text-rose-300">{String(this.state.error?.message || this.state.error)}</code>
        <button className="btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
      </div>
    );
  }
}
