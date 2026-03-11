// query-editor.tsx
import { useMonacoTheme } from '@/hooks/use-monaco-theme';
import { useConnection } from '@/hooks/use-connection';
import { buildSuggestions, parseConnectionSchema, getQueryAtCursor } from '@/lib/suggestions';
import Editor from '@monaco-editor/react';
import * as React from 'react';
import { Parser } from 'node-sql-parser';

const parser = new Parser();

function validateSQL(sql: string, monaco: any, clientType: string = 'PostgreSQL'): any[] {
  const markers: any[] = [];
  if (!sql.trim()) return markers;

  try {
    let dbOpt = 'PostgreSQL';
    if (clientType === 'mysql' || clientType === 'MySQL') dbOpt = 'MySQL';
    else if (clientType === 'mariadb' || clientType === 'MariaDB') dbOpt = 'MariaDB';
    else if (clientType === 'sqlite' || clientType === 'SQLite') dbOpt = 'sqlite';
    parser.parse(sql, { database: dbOpt });
  } catch (e: any) {
    const loc = e.location?.start;
    markers.push({
      startLineNumber: loc?.line ?? 1,
      startColumn: loc?.column ?? 1,
      endLineNumber: loc?.line ?? 1,
      endColumn: (loc?.column ?? 1) + 20,
      message: e.message ?? 'SQL syntax error',
      severity: monaco.MarkerSeverity.Error,
    });
  }

  return markers;
}

function injectErrorLensStyles() {
  const id = 'error-lens-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  // .monaco-editor prefix needed to override Monaco's own token color classes (mtk1, etc.)
  style.innerHTML = `
    .monaco-editor .error-lens-line {
      background-color: rgba(255, 50, 50, 0.08) !important;
      border-left: 2px solid #f44747 !important;
    }
    .monaco-editor .warning-lens-line {
      background-color: rgba(255, 200, 0, 0.08) !important;
      border-left: 2px solid #cca700 !important;
    }
    .monaco-editor .error-lens-message {
      color: #f44747 !important;
      font-style: italic !important;
      opacity: 0.9 !important;
      letter-spacing: 0 !important;
      font-family: 'Geist Mono';
      width: max-content;
    }
    .monaco-editor .warning-lens-message {
      color: #cca700 !important;
      font-style: italic !important;
      opacity: 0.9 !important;
      letter-spacing: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

// Store active error widgets so we can remove them
const errorWidgets: any[] = [];

function clearErrorWidgets(editor: any) {
  errorWidgets.forEach((w) => editor.removeContentWidget(w));
  errorWidgets.length = 0;
}

function applyErrorLens(
  editor: any,
  monaco: any,
  markers: any[],
  prevIds: string[]
): string[] {
  // Clear old line background decorations
  const cleared = editor.deltaDecorations(prevIds, []);

  // Clear old message widgets
  clearErrorWidgets(editor);

  if (!markers.length) return cleared;

  // Line background decorations
  const decorations = markers.map((marker) => {
    const isError = marker.severity === monaco.MarkerSeverity.Error;
    return {
      range: new monaco.Range(marker.startLineNumber, 1, marker.startLineNumber, 1),
      options: {
        isWholeLine: true,
        className: isError ? 'error-lens-line' : 'warning-lens-line',
      },
    };
  });
  const ids = editor.deltaDecorations([], decorations);

  // ContentWidget for each message — real DOM node, always visible
  markers.forEach((marker, i) => {
    const isError = marker.severity === monaco.MarkerSeverity.Error;

    const domNode = document.createElement('span');
    domNode.className = isError ? 'error-lens-message' : 'warning-lens-message';
    domNode.textContent = '\u00a0\u00a0' + marker.message;

    const widget = {
      getId: () => `error-lens-widget-${i}-${marker.startLineNumber}`,
      getDomNode: () => domNode,
      getPosition: () => ({
        position: { lineNumber: marker.startLineNumber, column: 9999 },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      }),
    };

    editor.addContentWidget(widget);
    errorWidgets.push(widget);
  });

  return ids;
}


type QueryEditorProps = {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onEditorMount?: (
    getSelectedText: () => { text: string; range?: any } | null
  ) => void;
  onEditorFocusChange?: (isFocused: boolean) => void;
  readOnly?: boolean;
  language?: string;
};

export function QueryEditor({ value, onChange, onEditorMount, onEditorFocusChange, readOnly = false, language = "sql" }: QueryEditorProps) {
  const { isDark, applyEditorTheme, resolveFontFamily } = useMonacoTheme();
  const { activeConnection } = useConnection();

  const tablesRef = React.useRef(parseConnectionSchema(activeConnection));
  tablesRef.current = parseConnectionSchema(activeConnection);

  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const decorationsRef = React.useRef<string[]>([]);
  const clearTimerRef = React.useRef<any>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const errorLensIdsRef = React.useRef<string[]>([]);
  const lastMarkersRef = React.useRef<any[]>([]);

  const validate = React.useCallback(
    (sql: string, model: any, editor: any, monaco: any) => {
      const markers = validateSQL(sql, monaco, 'PostgreSQL');
      lastMarkersRef.current = markers;
      monaco.editor.setModelMarkers(model, 'sql-owner', markers);
      errorLensIdsRef.current = applyErrorLens(editor, monaco, markers, errorLensIdsRef.current);
    },
    [activeConnection]
  );

  React.useEffect(() => {
    if (!monacoRef.current) return;

    const monaco = monacoRef.current;
    const provider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', ','],
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

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

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

      editor.revealRangeInCenterIfOutsideViewport(new monaco.Range(
        range.startLineNumber,
        range.startColumn,
        range.endLineNumber,
        range.endColumn
      ));

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
      defaultLanguage={language}
      value={value}
      onChange={onChange}
      beforeMount={(monaco) => {
        applyEditorTheme(monaco, isDark);
        injectErrorLensStyles();
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        const model = editor.getModel();
        if (model) {
          validate(editor.getValue(), model, editor, monaco);

          editor.onDidChangeModelContent(() => {
            // Re-apply lens instantly with last known markers (keeps message visible while typing)
            errorLensIdsRef.current = applyErrorLens(editor, monaco, lastMarkersRef.current, errorLensIdsRef.current);

            // Re-validate after debounce
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              const currentModel = editor.getModel();
              if (currentModel) {
                validate(editor.getValue(), currentModel, editor, monaco);
              }
            }, 500);
          });
        }

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

            const position = editor.getPosition();
            if (!position) return null;

            return getQueryAtCursor(model, position, monaco);
          });
        }

        if (onEditorFocusChange) {
          editor.onDidFocusEditorText(() => onEditorFocusChange(true));
          editor.onDidBlurEditorText(() => onEditorFocusChange(false));
        }

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
        contextmenu: true,
        readOnly: readOnly,
        language: language,
        minimap: {
          enabled: false
        },
        overviewRulerBorder: false,
        lineDecorationsWidth: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
        },
        cursorBlinking: 'expand',
        mouseWheelZoom: true,
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
    />
  );
}