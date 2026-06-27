/**
 * ErrorBoundary — 渲染异常兜底
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-dvh place-items-center bg-background p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              应用出现异常
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error.message}
            </p>
            <Button className="mt-6" onClick={this.handleReload}>
              重新加载
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}