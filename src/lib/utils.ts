import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getAllStatements = (text: string): { text: string; startIndex: number; endIndex: number }[] => {
  const statements: { text: string; startIndex: number; endIndex: number }[] = [];
  let currentStart = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === ';') {
      let trimmedStart = currentStart;
      while (trimmedStart < i && /\s/.test(text[trimmedStart])) {
        trimmedStart++;
      }

      let trimmedEnd = i;
      while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) {
        trimmedEnd--;
      }

      if (trimmedStart < trimmedEnd) {
        statements.push({
          text: text.substring(trimmedStart, trimmedEnd),
          startIndex: trimmedStart,
          endIndex: trimmedEnd
        });
      }
      currentStart = i + 1;
    }
  }

  // Handing the last statement if it doesn't end with a semicolon
  if (currentStart < text.length) {
    let trimmedStart = currentStart;
    while (trimmedStart < text.length && /\s/.test(text[trimmedStart])) {
      trimmedStart++;
    }

    let trimmedEnd = text.length;
    while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) {
      trimmedEnd--;
    }

    if (trimmedStart < trimmedEnd) {
      statements.push({
        text: text.substring(trimmedStart, trimmedEnd),
        startIndex: trimmedStart,
        endIndex: trimmedEnd
      });
    }
  }

  return statements;
};

export const getCurrentStatement = (model: { getValue: () => string; getOffsetAt: (position: { lineNumber: number; column: number }) => number; getPositionAt: (offset: number) => { lineNumber: number; column: number } }, position: { lineNumber: number; column: number }): { text: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } } => {
  const fullText = model.getValue();
  const offset = model.getOffsetAt(position);
  const statements = getAllStatements(fullText);

  if (statements.length === 0) {
    return {
      text: fullText,
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: model.getPositionAt(fullText.length).lineNumber,
        endColumn: model.getPositionAt(fullText.length).column
      }
    };
  }

  // Find the statement the cursor is currently inside or immediately adjacent to
  let matched = statements.find(stmt => offset >= stmt.startIndex && offset <= stmt.endIndex);

  // If outside any statement bounds (e.g. whitespace between them or after a trailing semicolon),
  // fallback to the most recent statement that ended before the cursor.
  if (!matched) {
    const beforeStatements = statements.filter(stmt => stmt.endIndex < offset);
    if (beforeStatements.length > 0) {
      matched = beforeStatements[beforeStatements.length - 1];
    } else {
      matched = statements[0]; // Cursor is before any statement, fallback to the first
    }
  }

  const startPos = model.getPositionAt(matched.startIndex);
  const endPos = model.getPositionAt(matched.endIndex);

  return {
    text: matched.text,
    range: {
      startLineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endLineNumber: endPos.lineNumber,
      endColumn: endPos.column
    }
  };
};