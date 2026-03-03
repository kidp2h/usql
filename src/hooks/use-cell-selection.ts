import * as React from "react";

export function useCellSelection(copyText: (text: string) => void | Promise<void>) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryRef = React.useRef<HTMLDivElement>(null);
  const footerSummaryContentRef = React.useRef<HTMLSpanElement>(null);

  const finalizedSelectionRef = React.useRef<Set<string>>(new Set());
  const isSelectingCellRef = React.useRef(false);
  const selectionStartRef = React.useRef<{ row: number; col: number } | null>(null);
  const selectionEndRef = React.useRef<{ row: number; col: number } | null>(null);
  const mousePositionRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollAnimationFrameRef = React.useRef<number | null>(null);

  const isJSON = (str: string) => {
    if (!str || str === "null") return false;
    if (!(str.startsWith("{") && str.endsWith("}")) && !(str.startsWith("[") && str.endsWith("]"))) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

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
    let singleCellText = "";
    let singleCellType = "";

    allCells.forEach((cell) => {
      const r = parseInt(cell.getAttribute("data-row") || "-1", 10);
      const c = parseInt(cell.getAttribute("data-col") || "-1", 10);
      const isInDrag = r >= minRow && r <= maxRow && c >= minCol && c <= maxCol;
      const isFinalized = finalizedSelectionRef.current.has(`${r},${c}`);

      if (isInDrag || isFinalized) {
        cell.setAttribute("data-selected", "true");
        count++;
        const text = (cell.textContent || "").trim();
        if (count === 1) {
          singleCellText = text;
          singleCellType = cell.getAttribute("data-type") || "";
        }
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

      const jsonBtn = document.getElementById("view-as-json-button");
      if (jsonBtn) {
        if (count === 1 && singleCellType === "string" && isJSON(singleCellText)) {
          jsonBtn.classList.remove("hidden");
        } else {
          jsonBtn.classList.add("hidden");
        }
      }
    }
  }, [isJSON]);

  const stopScrollLoop = React.useCallback(() => {
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const startScrollLoop = React.useCallback(() => {
    if (!tableContainerRef.current) return;

    const loop = () => {
      if (!isSelectingCellRef.current || !tableContainerRef.current) {
        stopScrollLoop();
        return;
      }

      const container = tableContainerRef.current;
      const rect = container.getBoundingClientRect();
      const { x, y } = mousePositionRef.current;

      const threshold = 40;
      const maxScroll = 15;

      let dx = 0;
      let dy = 0;

      if (x > rect.right - threshold) dx = Math.min(maxScroll, (x - (rect.right - threshold)) / 2);
      else if (x < rect.left + threshold) dx = -Math.min(maxScroll, (rect.left + threshold - x) / 2);

      if (y > rect.bottom - threshold) dy = Math.min(maxScroll, (y - (rect.bottom - threshold)) / 2);
      else if (y < rect.top + threshold) dy = -Math.min(maxScroll, (rect.top + threshold - y) / 2);

      if (dx !== 0 || dy !== 0) {
        container.scrollLeft += dx;
        container.scrollTop += dy;

        // Re-calculate the cell under mouse after scroll
        const element = document.elementFromPoint(x, y);
        const cell = element?.closest(".data-cell");
        if (cell && selectionStartRef.current && selectionEndRef.current) {
          const r = parseInt(cell.getAttribute("data-row") || "-1", 10);
          const c = parseInt(cell.getAttribute("data-col") || "-1", 10);
          const isSelectCol = cell.getAttribute("data-col-id") === "select";
          if (!isSelectCol && r !== -1 && c !== -1) {
            selectionEndRef.current = { row: r, col: c };
            updateSelectionDOM(selectionStartRef.current!.row, selectionStartRef.current!.col, r, c);
          }
        }
      }

      scrollAnimationFrameRef.current = requestAnimationFrame(loop);
    };

    stopScrollLoop();
    scrollAnimationFrameRef.current = requestAnimationFrame(loop);
  }, [updateSelectionDOM, stopScrollLoop]);

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
      stopScrollLoop();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      stopScrollLoop();
    };
  }, [stopScrollLoop]);

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
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    updateSelectionDOM(rowIndex, colIndex, rowIndex, colIndex);
    startScrollLoop();
  }, [updateSelectionDOM, startScrollLoop]);

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

  const getSingleSelectedCellText = React.useCallback(() => {
    const selectedCells = Array.from(
      tableContainerRef.current?.querySelectorAll('.data-cell[data-selected="true"]') || [],
    );
    if (selectedCells.length !== 1) return null;
    return (selectedCells[0].textContent || "").trim();
  }, []);

  return {
    tableContainerRef,
    footerSummaryRef,
    footerSummaryContentRef,
    finalizedSelectionRef,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCopy,
    handleCopyInStatement,
    getSingleSelectedCellText,
  };
}