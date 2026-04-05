import CodeMirror from '@uiw/react-codemirror'
import {sql, PostgreSQL} from '@codemirror/lang-sql'
import {linter, Diagnostic, lintGutter,} from '@codemirror/lint'
import {githubDark, githubLight} from '@uiw/codemirror-themes-all'
import {Parser} from 'node-sql-parser'
import {useTheme} from "@/hooks/use-theme";
import * as React from "react";
import {parseConnectionCmSchema} from "@/lib/suggestions";
import {useConnection} from "@/hooks/use-connection";
import {EditorView} from '@codemirror/view'
import {errorLensField, setDiagnostics} from "@/lib/decoration";
import {autocompletion} from "@codemirror/autocomplete";
import {Box, Columns3, Table2, Type} from "lucide-react";
import {renderToStaticMarkup} from "react-dom/server";

const parser = new Parser()
function iconSvg(type: string): string {
    const icons: Record<string, any> = {
        keyword:  <Type size={13} />,
        function: <Box size={13} />,
        type:     <Table2 size={13} />,      // table
        property: <Columns3 size={13} />,    // column
    }
    const el = icons[type] ?? <Box size={13} />
    return renderToStaticMarkup(el)
}

const iconColors: Record<string, string> = {
    keyword:  '#b4befe',
    function: '#89b4fa',
    type:     '#94e2d5',
    property: '#f38ba8',
}
const sqlLinter = linter(
    (view) => {
        const query = view.state.doc.toString().trim()
        if (!query) {
            view.dispatch({effects: setDiagnostics.of([])})
            return []
        }
        try {
            parser.astify(query, {database: 'PostgreSQL'})
            view.dispatch({effects: setDiagnostics.of([])})
            return []
        } catch (e: any) {
            const diagnostics: Diagnostic[] = [{
                from: 0,
                to: view.state.doc.length,
                severity: 'error',
                message: e.message,
            }]
            view.dispatch({effects: setDiagnostics.of(diagnostics)})
            return diagnostics
        }
    },
    {delay: 500}
)
const autocompleteTheme = autocompletion({
    addToOptions: [
        {
            render(completion) {
                const wrap = document.createElement('span')
                wrap.className = 'cm-completion-icon-wrap'
                wrap.style.backgroundColor = iconColors[completion.type ?? ''] ?? '#6c7086'
                wrap.innerHTML = iconSvg(completion.type ?? '')
                // tint icon color sang dark để contrast với bg
                const svg = wrap.querySelector('svg')
                if (svg) {
                    svg.style.color = '#1e1e2e'
                    svg.style.stroke = '#1e1e2e'
                }
                return wrap
            },
            position: 0,  // trước label
        },
    ],
})

export function SqlEditor({value, onChange, theme}) {
    const {activeConnection} = useConnection();
    const schema = React.useMemo(() => parseConnectionCmSchema(activeConnection), [activeConnection]);
    const fontTheme = EditorView.theme({
        '.cm-scroller': { overflow: 'auto' },
        '.cm-content, .cm-gutter': {
            fontFamily: '"CascadiaCode Nerd Font", "Cascadia Code", monospace',
            fontSize: '14px',
            minHeight: '100%',
        },
        '.cm-line': {
            whiteSpace: 'pre',   // giữ dòng không wrap
        },
        // suggestion box
        '.cm-tooltip.cm-tooltip-autocomplete': {
            border: 'none',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            backgroundColor: '#1e1e2e',
            padding: '4px 4px 4px 0',
            overflow: 'hidden',
            minWidth: '320px',
        },
        '.cm-tooltip-autocomplete > ul': {
            fontFamily: '"CascadiaCode Nerd Font", monospace',
            fontSize: '13px',
            maxHeight: '400px',
            padding: '0',
            margin: '0',
            listStyle: 'none',
        },
        '.cm-tooltip-autocomplete > ul > li': {
            display: 'flex',
            alignItems: 'center',
            padding: '0',
            borderRadius: '0 6px 6px 0',
            margin: '1px 4px 1px 0',
            color: '#cdd6f4',
            overflow: 'hidden',
            cursor: 'pointer',
            minHeight: '35px',
        },
        '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: '#313244',
        },

        // ẩn icon mặc định
        '.cm-completionIcon': { display: 'none' },

        // icon wrap sát lề trái
        '.cm-completion-icon-wrap': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35px',
            minWidth: '35px',
            height: '35px',
            alignSelf: 'stretch',
            flexShrink: '0',
            marginLeft: '0',
            borderRadius: '4px',
        },

        '.cm-completionLabel': {
            flex: '1',
            padding: '0 10px 0 8px',
        },
        '.cm-completionDetail': {
            fontSize: '11px',
            color: '#6c7086',
            paddingRight: '8px',
            fontStyle: 'normal',
        },
        '.cm-completionMatchedText': {
            textDecoration: 'none',
            color: '#89dceb',
            fontWeight: '600',
        },
    })
    return (
        <CodeMirror
            className="overflow-scroll h-full"
            value={value}
            theme={theme == 'light' ? githubLight : githubDark}
            height="100%"
            onChange={onChange}
            extensions={[
                sql({dialect: PostgreSQL, schema}),
                autocompleteTheme,
                errorLensField,
                sqlLinter,
                fontTheme,
            ]}
        />
    )
}