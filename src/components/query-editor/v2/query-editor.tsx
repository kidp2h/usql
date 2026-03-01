// query-editor.tsx
import { useMonacoTheme } from '@/hooks/use-monaco-theme';
import { useConnection } from '@/hooks/use-connection';
import { buildSuggestions, parseConnectionSchema, getQueryAtCursor } from '@/lib/suggestions';
import Editor from '@monaco-editor/react';
import * as React from 'react';

type QueryEditorProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onEditorMount?: (
    getSelectedText: () => { text: string; range?: any } | null
  ) => void;
  onEditorFocusChange?: (isFocused: boolean) => void;
};

export function QueryEditor({ value, onChange, onEditorMount, onEditorFocusChange }: QueryEditorProps) {
  const { isDark, applyEditorTheme, resolveFontFamily } = useMonacoTheme();
  const { activeConnection } = useConnection();

  const tablesRef = React.useRef(parseConnectionSchema(activeConnection));
  tablesRef.current = parseConnectionSchema(activeConnection);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const decorationsRef = React.useRef<string[]>([]);
  const clearTimerRef = React.useRef<any>(null);

  // Handle completion provider lifecycle
  React.useEffect(() => {
    if (!monacoRef.current) return;

    const monaco = monacoRef.current;
    const provider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '\n', '*', ',', ')'],
      provideCompletionItems(model: any, position: any) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: buildSuggestions(monaco, range, tablesRef.current, model, position),
        };
      },
    });

    return () => {
      provider.dispose();
    };
  }, [monacoRef.current]);

  React.useEffect(() => {
    const handleHighlight = (e: any) => {
      const { range } = e.detail;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!range || !editor || !monaco) return;

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

      // Clear previous decorations
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

      // Add new decoration: background + border + gutter line
      const newDecorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(
            range.startLineNumber,
            1,
            range.endLineNumber,
            1
          ),
          options: {
            isWholeLine: true,
            className: 'bg-slate-400/50 dark:bg-slate-100/10 border-y-2 border-slate-500/10',
            linesDecorationsClassName: 'w-[4px] ml-1',
          }
        }
      ]);
      decorationsRef.current = newDecorations;

      // Ensure it's in view
      editor.revealRangeInCenterIfOutsideViewport(new monaco.Range(
        range.startLineNumber,
        range.startColumn,
        range.endLineNumber,
        range.endColumn
      ));

      // Remove after a longer delay (1.5s for visibility test)
      clearTimerRef.current = setTimeout(() => {
        if (editorRef.current) {
          decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
        }
        clearTimerRef.current = null;
      }, 1500);
    };

    globalThis.addEventListener("usql:highlight-range", handleHighlight);
    return () => {
      globalThis.removeEventListener("usql:highlight-range", handleHighlight);
    };
  }, []);

  return (
    <Editor
      theme={isDark ? 'usql-dark' : 'usql-light'}
      defaultLanguage="sql"
      value={value}
      onChange={onChange}
      beforeMount={(monaco) => {
        applyEditorTheme(monaco, isDark);
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        if (onEditorMount) {
          onEditorMount(() => {
            const selection = editor.getSelection();
            const model = editor.getModel();
            if (!model) return null;

            if (selection && !selection.isEmpty()) {
              return {
                text: model.getValueInRange(selection),
                range: selection,
              };
            }

            // No selection - find query at cursor
            const position = editor.getPosition();
            if (!position) return null;

            return getQueryAtCursor(model, position, monaco);
          });
        }

        if (onEditorFocusChange) {
          editor.onDidFocusEditorText(() => onEditorFocusChange(true));
          editor.onDidBlurEditorText(() => onEditorFocusChange(false));
        }

        // Global shortcuts for execution
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'execute' } }));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
          globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'explain' } }));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'save' } }));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
          globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'save-as' } }));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
          globalThis.dispatchEvent(new CustomEvent('usql:command', { detail: { type: 'format' } }));
        });
      }}
      options={{
        fontFamily: resolveFontFamily(),
        wordBasedSuggestions: 'off',
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
    />
  );
}


