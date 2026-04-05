import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { linter, Diagnostic } from '@codemirror/lint'

// effect để set diagnostics vào state
export const setDiagnostics = StateEffect.define<Diagnostic[]>()

// field lưu decorations
export const errorLensField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(deco, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setDiagnostics)) {
                const widgets = effect.value.map((d) => {
                    const line = tr.state.doc.lineAt(d.from)
                    return Decoration.widget({
                        widget: new ErrorLensWidget(d.message, d.severity),
                        side: 1,
                    }).range(line.to)
                })
                return Decoration.set(widgets, true)
            }
        }
        return deco.map(tr.changes)
    },
    provide: (f) => EditorView.decorations.from(f),
})

// widget render text cuối dòng
class ErrorLensWidget extends WidgetType {
    constructor(readonly message: string, readonly severity: string) {
        super()
    }

    toDOM() {
        const el = document.createElement('span')
        el.textContent = `  ⚠ ${this.message}`
        el.style.cssText = `
            color: ${this.severity === 'error' ? '#f87171' : '#fbbf24'};
            opacity: 0.8;
            font-style: italic;
            font-size: 0.9em;
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
        `
        return el
    }

    ignoreEvent() { return true }
}