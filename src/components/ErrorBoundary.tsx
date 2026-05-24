import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional label shown to the user, e.g. "City Search". */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Page-level error boundary. Catches render-time exceptions and shows a
 * friendly fallback with a Retry / Reload affordance instead of letting the
 * red React overlay reach the client.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.label ?? "page", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#eef2f7] bg-white p-6 my-8">
        <h2 className="text-[15px] font-black text-[#0b1a36]">Something went wrong</h2>
        <p className="mt-2 text-[13px] text-[#526078]">
          {this.props.label
            ? `We hit an unexpected error in ${this.props.label}.`
            : "We hit an unexpected error rendering this page."}{" "}
          You can try again, or reload the app.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-[#f7faff] p-2 text-[11px] text-[#526078]">
          {this.state.error.message}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            onClick={this.reset}
            className="rounded-lg bg-[#0757ff] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#003c7e]"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-[#eef2f7] bg-white px-3 py-2 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff]"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
