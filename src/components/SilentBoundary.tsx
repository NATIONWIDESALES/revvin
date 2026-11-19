import { Component, ReactNode } from "react";

/** Renders nothing when a non-essential widget fails, so it cannot take down the page. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[SilentBoundary] widget hidden after error", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default SilentBoundary;
