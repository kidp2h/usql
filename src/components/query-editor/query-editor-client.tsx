"use client";

import * as React from "react";
import type { editor as MonacoEditor } from "monaco-editor";

type QueryEditorClientProps = {
  value: string;
  onChange: (value: string) => void;
  documentUri?: string;
  isDark: boolean;
  resolveFontFamily: () => string;
  applyEditorTheme: (monaco: any, isDark: boolean) => void;
};

export function QueryEditorClient({
  value,
  onChange,
  documentUri = "file:///query.sql",
  isDark,
  resolveFontFamily,
  applyEditorTheme,
}: QueryEditorClientProps) {
  const [MonacoEditor, setMonacoEditor] = React.useState<any>(null);
  const editorRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<typeof import("monaco-editor") | null>(null);
  const clientRef = React.useRef<any>(null);
  const [lspReady, setLspReady] = React.useState(false);

  // Load Monaco dynamically
  React.useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);

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
    if (!editorRef.current || !monacoRef.current || !lspReady) {
      return;
    }

    let mounted = true;

    const startLSP = async () => {
      if (typeof window === 'undefined') return;

      try {
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
  }, [lspReady]);

  // Apply theme when it changes
  React.useEffect(() => {
    if (monacoRef.current) {
      applyEditorTheme(monacoRef.current, isDark);
    }
  }, [applyEditorTheme, isDark]);

  if (!MonacoEditor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="sql"
      theme={isDark ? "usql-dark" : "usql-light"}
      path={documentUri}
      value={value}
      onChange={(nextValue: string) => onChange(nextValue ?? "")}
      onMount={(editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        
        applyEditorTheme(monaco, isDark);

        // Configure SQL language
        monaco.languages.setLanguageConfiguration('sql', {
          comments: {
            lineComment: '--',
            blockComment: ['/*', '*/'],
          },
          brackets: [
            ['(', ')'],
            ['{', '}'],
            ['[', ']'],
          ],
          autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: "'", close: "'" },
            { open: '"', close: '"' },
            { open: '`', close: '`' },
          ],
        });

        editor.updateOptions({
          fontFamily: resolveFontFamily(),
          renderLineHighlight: "none",
          contextmenu: false,
        });


        editor.focus();
      }}
      options={{
        fontSize: 14,
        fontFamily: resolveFontFamily(),
        renderLineHighlight: "none",
        contextmenu: false,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
      }}
    />
  );
}