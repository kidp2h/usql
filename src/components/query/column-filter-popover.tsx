import * as React from "react";
import { Column } from "@tanstack/react-table";
import { PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ColumnFilterPopoverProps {
  column: Column<Record<string, unknown>, unknown>;
  filterValue: string[];
}

export function ColumnFilterPopover({ column, filterValue }: ColumnFilterPopoverProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const { sortedUniqueValues, countMap } = React.useMemo(() => {
    const values = new Set<string>();
    const countMap = new Map<string, number>();
    column.getFacetedUniqueValues().forEach((count, val) => {
      const strVal = val === null || val === undefined ? "(Blanks)" : String(val);
      values.add(strVal);
      countMap.set(strVal, (countMap.get(strVal) ?? 0) + count);
    });
    return { sortedUniqueValues: Array.from(values).sort(), countMap };
  }, [column, column.getFacetedUniqueValues()]);

  const filteredValues = React.useMemo(
    () => sortedUniqueValues.filter((v) =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [sortedUniqueValues, searchTerm]
  );

  const selectedValuesSet = React.useMemo(
    () => new Set((filterValue ?? []).map(String)),
    [filterValue],
  );

  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: filteredValues.length,
    getScrollElement: () => listEl,
    estimateSize: () => 32,
    overscan: 5,
  });

  React.useLayoutEffect(() => {
    if (listEl) virtualizer.measure();
  }, [listEl, virtualizer]);

  const toggleValue = (value: string) => {
    column.setFilterValue((prev: any[] | undefined) => {
      const current = Array.isArray(prev) ? prev.map(String) : [];
      const index = current.indexOf(value);
      if (index === -1) return [...current, value];
      const next = current.filter((v) => v !== value);
      return next.length === 0 ? undefined : next;
    });
  };

  const isAllSelected = !filterValue?.length || filterValue.length === sortedUniqueValues.length;

  return (
    <PopoverContent className="w-60 p-0" align="start">
      <div className="flex flex-col">
        <div className="p-2 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${sortedUniqueValues.length} values...`}
              className="h-8 pl-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors border-b"
          onClick={(e) => { e.stopPropagation(); column.setFilterValue(undefined); }}
        >
          <Checkbox checked={isAllSelected} className="size-3.5 pointer-events-none" />
          <span className="text-xs font-medium flex-1">(Select All)</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {filteredValues.length}
          </span>
        </div>

        <div
          ref={setListEl}
          className="overflow-y-auto p-1"
          style={{ maxHeight: 240 }}
        >
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const value = filteredValues[virtualItem.index];
              return (
                <Label
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: virtualItem.start,
                    left: 0,
                    right: 0,
                    height: virtualItem.size,
                  }}
                  className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded-sm cursor-pointer transition-colors font-normal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedValuesSet.has(value)}
                    onCheckedChange={() => toggleValue(value)}
                    className="size-3.5"
                  />
                  <span className="text-xs truncate flex-1">{value}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
                    {countMap.get(value) ?? 0}
                  </span>
                </Label>
              );
            })}
          </div>
        </div>

        {filteredValues.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground italic">No values found</div>
        )}

        <div className="p-2 border-t flex justify-end bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => column.setFilterValue(undefined)}
          >
            Clear
          </Button>
        </div>
      </div>
    </PopoverContent>
  );
}
