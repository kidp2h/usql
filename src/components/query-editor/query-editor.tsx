"use client";

import dynamic from "next/dynamic";
import { useMonacoTheme } from "@/hooks/use-monaco-theme";

// Dynamic import với ssr: false
const QueryEditorClient = dynamic(
  () =>
    import("./query-editor-client").then((mod) => ({
      default: mod.QueryEditorClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    ),
  },
);

type QueryEditorProps = {
  value: string;
  onChange: (value: string) => void;
  documentUri?: string;
  language: string;
  readonly: boolean;
  onEditorMount?: (getSelectedText: () => { text: string; range?: any } | null) => void; // Thêm dòng này
  onEditorFocusChange?: (isFocused: boolean) => void;
};

export function QueryEditor(props: QueryEditorProps) {
  const { isDark, applyEditorTheme, resolveFontFamily } = useMonacoTheme();

  return (
    <QueryEditorClient
      {...props}
      isDark={isDark}
      applyEditorTheme={applyEditorTheme}
      resolveFontFamily={resolveFontFamily}
    />
  );
}
