import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Changing this value clears the error (e.g. the current pathname). */
  resetKey?: string;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Scoped error boundary. Keeps a failed section from blanking the whole page —
 * the surrounding chrome (nav, sidebar, footer) stays interactive and the user
 * gets an inline retry instead of a full-page "this page didn't load" screen.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[section-error]", error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto my-10 max-w-md rounded-2xl border border-white/10 bg-[#190737] p-6 text-center">
        <div className="label-mini text-[10px] tracking-[0.2em] text-[#B8ACCC]">
          {this.props.label ?? "Something didn't load"}
        </div>
        <p className="mt-2 text-sm text-[#C9BEDD]">
          This section couldn't load just now. The rest of the page still works.
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#FF003C] px-4 py-2 text-xs font-mono uppercase tracking-wider text-white transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }
}
