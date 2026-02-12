"use client";

import * as React from "react";
import type { editor as MonacoEditor } from "monaco-editor";

type QueryEditorLSPProps = {
  editor: MonacoEditor.IStandaloneCodeEditor;
  monaco: typeof import("monaco-editor");
};

export function QueryEditorLSP({ editor, monaco }: QueryEditorLSPProps) {
  const [lspReady, setLspReady] = React.useState(false);
  const clientRef = React.useRef<any>(null);

  // Check LSP status
  React.useEffect(() => {
    const checkLspStatus = async () => {
      if (typeof window === 'undefined') return;

      const { isElectronLSPAvailable, getLSPStatus } = await import("@/lib/ipc-transport");

      if (!isElectronLSPAvailable()) {
        console.warn('[LSP Client] Not running in Electron');
        return;
      }

      try {
        const status = await getLSPStatus();
        if (status.ok && status.ready) {
          console.log('[LSP Client] LSP server is ready');
          setLspReady(true);
        } else {
          console.warn('[LSP Client] LSP server not ready:', status.message);
        }
      } catch (error) {
        console.error('[LSP Client] Failed to check LSP status:', error);
      }
    };

    checkLspStatus();
  }, []);

  // Start LSP client
  React.useEffect(() => {
    if (!editor || !monaco || !lspReady) {
      return;
    }

    let mounted = true;

    const startLSP = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Dynamic imports to avoid SSR issues
        const { MonacoLanguageClient } = await import("monaco-languageclient");
        const { CloseAction, ErrorAction } = await import("vscode-languageclient");
        const { IPCMessageReader, IPCMessageWriter, isElectronLSPAvailable } = await import("@/lib/ipc-transport");

        if (!mounted) return;

        if (!isElectronLSPAvailable()) {
          console.warn('[LSP Client] electronLSP API not available');
          return;
        }

        console.log('[LSP Client] Starting SQL Language Client via IPC...');

        const reader = new IPCMessageReader();
        const writer = new IPCMessageWriter();

        const languageClient = new MonacoLanguageClient({
          name: "SQL Language Client",
          clientOptions: {
            documentSelector: [
              { scheme: 'file', language: 'sql' },
              { scheme: 'inmemory', language: 'sql' },
            ],
            errorHandler: {
              error: () => {
                console.error('[LSP Client] Error handler triggered');
                return { action: ErrorAction.Continue };
              },
              closed: () => {
                console.warn('[LSP Client] Connection closed');
                return { action: CloseAction.DoNotRestart };
              },
            },
            synchronize: {
              fileEvents: [],
            },
          },
          messageTransports: { reader, writer },
        });

        if (!mounted) {
          languageClient.stop();
          return;
        }

        clientRef.current = languageClient;
        
        await languageClient.start();
        
        if (mounted) {
          console.log('[LSP Client] SQL Language Client started successfully');
        }

      } catch (error) {
        console.error('[LSP Client] Error creating client:', error);
      }
    };

    startLSP();

    return () => {
      mounted = false;
      if (clientRef.current) {
        console.log('[LSP Client] Stopping SQL Language Client...');
        clientRef.current.stop();
      }
    };
  }, [editor, monaco, lspReady]);

  return null; // This component doesn't render anything
}