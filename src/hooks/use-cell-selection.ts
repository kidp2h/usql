import * as React from "react";

export function useCellSelection(copyText: (text: string) => void | Promise<void>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryContentRef = React.useRef<HTMLSpanElement>(null);

  const finalizedSelectionRef = React.useRef<Set<string>>(new Set());
  const isSelectingCellRef = React.useRef(false);
  const selectionStartRef = React.useRef<{ row: number; col: number } | null>(null);
  const selectionEndRef = React.useRef<{ row: number; col: number } | null>(null);

  const updateSelectionDOM = React.useCallback((
    startRow: number, startCol: number,
    endRow: number, endCol: number,
  ) => {
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const allCells = tableContainerRef.current?.querySelectorAll(".data-cell") || [];
    let sum = 0, count = 0, hasNonNumeric = false;

    allCells.forEach((cell) => {
      const r = parseInt(cell.getAttribute("data-row") || "-1", 10);
      const c = parseInt(cell.getAttribute("data-col") || "-1", 10);
      const isInDrag = r >= minRow && r <= maxRow && c >= minCol && c <= maxCol;
      const isFinalized = finalizedSelectionRef.current.has(`${r},${c}`);

      if (isInDrag || isFinalized) {
        cell.setAttribute("data-selected", "true");
        count++;
        const text = (cell.textContent || "").trim();
        if (text !== "") {
          if (text.toLowerCase() === "null") {
            hasNonNumeric = true;
          } else {
            const num = Number(text.replace(/,/g, ""));
            if (Number.isNaN(num)) hasNonNumeric = true;
            else sum += num;
          }
        }
      } else {
        cell.removeAttribute("data-selected");
      }
    });

    if (footerSummaryContentRef.current && footerSummaryRef.current) {
      if (count === 0) {
        footerSummaryContentRef.current.textContent = "";
        footerSummaryRef.current.classList.add("invisible");
      } else if (hasNonNumeric) {
        footerSummaryContentRef.current.textContent = `Count: ${count}`;
        footerSummaryRef.current.classList.remove("invisible");
      } else {
        const displaySum = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(sum);
        footerSummaryContentRef.current.textContent = `Count: ${count} | Sum: ${displaySum}`;
        footerSummaryRef.current.classList.remove("invisible");
      }
    }
  }, []);

  React.useEffect(() => {
    const handleMouseUp = () => {
      if (isSelectingCellRef.current && selectionStartRef.current && selectionEndRef.current) {
        const { row: sr, col: sc } = selectionStartRef.current;
        const { row: er, col: ec } = selectionEndRef.current;
        for (let r = Math.min(sr, er); r <= Math.max(sr, er); r++)
          for (let c = Math.min(sc, ec); c <= Math.max(sc, ec); c++)
            finalizedSelectionRef.current.add(`${r},${c}`);
      }
      isSelectingCellRef.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleCellMouseDown = React.useCallback((
    e: React.MouseEvent, rowIndex: number, colIndex: number, isSelectCol: boolean,
  ) => {
    if (isSelectCol) return;
    const key = `${rowIndex},${colIndex}`;
    const isAlreadySelected = finalizedSelectionRef.current.has(key);

    if (e.button === 2) {
      if (isAlreadySelected) return;
      finalizedSelectionRef.current.clear();
      updateSelectionDOM(rowIndex, colIndex, rowIndex, colIndex);
      finalizedSelectionRef.current.add(key);
      return;
    }

    e.preventDefault();
    tableContainerRef.current?.focus();

    if (!e.ctrlKey && !e.metaKey) finalizedSelectionRef.current.clear();

    isSelectingCellRef.current = true;
    selectionStartRef.current = { row: rowIndex, col: colIndex };
    selectionEndRef.current = { row: rowIndex, col: colIndex };
    updateSelectionDOM(rowIndex, colIndex, rowIndex, colIndex);
  }, [updateSelectionDOM]);

  const handleCellMouseEnter = React.useCallback((
    rowIndex: number, colIndex: number, isSelectCol: boolean,
  ) => {
    if (isSelectCol || !isSelectingCellRef.current || !selectionStartRef.current) return;
    selectionEndRef.current = { row: rowIndex, col: colIndex };
    updateSelectionDOM(selectionStartRef.current.row, selectionStartRef.current.col, rowIndex, colIndex);
  }, [updateSelectionDOM]);

  const getSelectedMatrix = React.useCallback(() => {
    const selectedCells = Array.from(
      tableContainerRef.current?.querySelectorAll('.data-cell[data-selected="true"]') || [],
    );
    if (selectedCells.length === 0) return null;

    const rowMap = new Map<number, { col: number; text: string; type: string }[]>();
    selectedCells.forEach((cell) => {
      const r = parseInt(cell.getAttribute("data-row") || "-1", 10);
      const c = parseInt(cell.getAttribute("data-col") || "-1", 10);
      const type = cell.getAttribute("data-type") || "string";
      const text = cell.textContent || "";
      if (!rowMap.has(r)) rowMap.set(r, []);
      rowMap.get(r)!.push({ col: c, text, type });
    });
    return rowMap;
  }, []);

  const handleCopy = React.useCallback(() => {
    const rowMap = getSelectedMatrix();
    if (!rowMap) return;

    const sorted = Array.from(rowMap.keys()).sort((a, b) => a - b);
    const text = sorted.map((r) => {
      const cols = rowMap.get(r)!.sort((a, b) => a.col - b.col);
      return cols.map((c) => (c.text !== "null" ? c.text : "NULL")).join("\t");
    }).join("\n");

    copyText(text);
  }, [getSelectedMatrix, copyText]);

  const handleCopyInStatement = React.useCallback(() => {
    const rowMap = getSelectedMatrix();
    if (!rowMap) return;

    const values: string[] = [];
    rowMap.forEach((cols) => {
      cols.forEach((c) => {
        if (c.text !== "null") {
          values.push(c.type === "number" ? c.text : `'${c.text.replace(/'/g, "''")}'`);
        }
      });
    });
    if (values.length === 0) return;

    copyText(`IN (${Array.from(new Set(values)).join(", ")})`);
  }, [getSelectedMatrix, copyText]);

  return {
    tableContainerRef,
    footerSummaryRef,
    footerSummaryContentRef,
    finalizedSelectionRef,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCopy,
    handleCopyInStatement,
  };
}