"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, Table as TableIcon, Settings2, FileCode, Search, AlertCircle, RefreshCw } from "lucide-react";
import { TreeDataItem } from "@/components/tree-view";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn, formatBytes } from "@/lib/utils";

interface ModalDumpDatabaseProps {
  isOpen: boolean;
  onClose: () => void;
  item: TreeDataItem; // The connection node
}

export function ModalDumpDatabase({ isOpen, onClose, item }: ModalDumpDatabaseProps) {
  const [pgDumpPath, setPgDumpPath] = React.useState("");
  const [selectedTables, setSelectedTables] = React.useState<string[]>([]);
  const [exportMode, setExportMode] = React.useState<"copy" | "insert">("copy");
  const [exportType, setExportType] = React.useState<"schema" | "both">("both");
  const [tables, setTables] = React.useState<{ name: string; schema: string; size: number }[]>([]);
  const [loadingTables, setLoadingTables] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [pathError, setPathError] = React.useState<string | null>(null);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const connections = useSidebarStore((state) => state.connections);
  const connection = connections.find((c) => c.id === item.id);

  const filteredTables = React.useMemo(() => {
    return tables.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tables, searchTerm]);

  React.useEffect(() => {
    if (isOpen && connection) {
      fetchTables();
    }
  }, [isOpen, connection]);

  const fetchTables = async () => {
    if (!connection) return;
    setFetchError(null);

    // Try to find tables in the existing sidebar tree data first
    const findTablesInTree = (nodes: TreeDataItem[]): { name: string; schema: string; size: number }[] => {
      let results: { name: string; schema: string; size: number }[] = [];
      for (const node of nodes) {
        // Simple check for table nodes based on ID pattern used in the app
        const isTableNode = node.id.includes(":table:") &&
          !node.id.includes(":columns") &&
          !node.id.includes(":indexes");

        if (isTableNode) {
          results.push({
            name: node.name,
            schema: "public",
            size: (node as any).size || 0
          });
        }

        if (node.children) {
          results = [...results, ...findTablesInTree(node.children)];
        }
      }
      return results;
    };

    const existingTables = connection.children ? findTablesInTree(connection.children) : [];

    // If we already have tables in the tree, use them and don't fetch again
    if (existingTables.length > 0) {
      setTables(existingTables);
      return;
    }

    setLoadingTables(true);
    try {
      // Fallback: fetch from database if not in sidebar tree
      const res = await window.electron.getTables(connection, "public");
      if (res.ok && Array.isArray(res.tables)) {
        setTables(res.tables.map((t: any) => ({
          name: t.name,
          schema: "public",
          size: t.size || 0
        })));
      } else {
        setFetchError(res.message || "Failed to connect to database. Please check if your connection is active.");
      }
    } catch (error: any) {
      console.error("Failed to fetch tables:", error);
      setFetchError(error.message || "An unexpected error occurred while connecting to the database.");
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSelectPgDump = async () => {
    const result = await window.electron.showOpenDialog({
      title: "Select pg_dump.exe",
      properties: ["openFile"],
      filters: [{ name: "Executable", extensions: ["exe", "bin", "*"] }],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      const fileName = selectedPath.split(/[\\/]/).pop()?.toLowerCase() || "";

      if (!fileName.includes("pg_dump")) {
        setPathError("Selected file does not appear to be pg_dump");
        setPgDumpPath(selectedPath);
      } else {
        setPathError(null);
        setPgDumpPath(selectedPath);
      }
    }
  };

  const toggleTable = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleStartDump = () => {
    console.log("Start dump clicked with:", {
      pgDumpPath,
      selectedTables,
      exportMode,
      exportType,
    });
    // Function stub as requested
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Dump Database: {connection?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
          {/* pg_dump path */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              pg_dump Path
            </Label>
            <div className="flex gap-2">
              <Input
                value={pgDumpPath}
                readOnly
                placeholder="Select pg_dump.exe path..."
                className={cn(
                  "bg-muted/50",
                  pathError && "border-destructive ring-destructive focus-visible:ring-destructive"
                )}
              />
              <Button variant="outline" onClick={handleSelectPgDump}>
                Browse
              </Button>
            </div>
            {pathError && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-3 w-3" />
                {pathError}
              </div>
            )}
          </div>

          {/* Tables Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Select Tables ({selectedTables.length} selected)
            </Label>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="border rounded-lg bg-muted/30 flex flex-col">
              {filteredTables.length > 0 && (
                <div className="flex items-center space-x-2 p-2 px-3.5 border-b bg-muted/50 rounded-t-lg transition-colors">
                  <Checkbox
                    id="select-all-tables"
                    checked={
                      filteredTables.length > 0 &&
                      filteredTables.every((t) => selectedTables.includes(t.name))
                    }
                    onCheckedChange={() => {
                      const allFilteredNames = filteredTables.map((t) => t.name);
                      const isAllSelected = allFilteredNames.every((name) =>
                        selectedTables.includes(name)
                      );
                      if (isAllSelected) {
                        setSelectedTables((prev) =>
                          prev.filter((name) => !allFilteredNames.includes(name))
                        );
                      } else {
                        setSelectedTables((prev) => [
                          ...new Set([...prev, ...allFilteredNames]),
                        ]);
                      }
                    }}
                  />
                  <label
                    htmlFor="select-all-tables"
                    className="text-sm font-bold leading-none cursor-pointer flex-1"
                  >
                    Select All ({filteredTables.length} tables found)
                  </label>
                </div>
              )}
              <ScrollArea className="h-[200px] w-full p-2">
                {fetchError ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 px-4 text-center">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Connection Failed
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {fetchError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTables}
                      className="h-8"
                    >
                      <RefreshCw className="mr-2 h-3.3 w-3.3" />
                      Retry Connection
                    </Button>
                  </div>
                ) : loadingTables ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Loading tables...
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {searchTerm ? "No tables match your search" : "No tables found (showing public schema)"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {filteredTables.map((table) => (
                      <div
                        key={table.name}
                        className="flex items-center space-x-2 p-1.5 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                      >
                        <Checkbox
                          id={`table-${table.name}`}
                          checked={selectedTables.includes(table.name)}
                          onCheckedChange={() => toggleTable(table.name)}
                        />
                        <label
                          htmlFor={`table-${table.name}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {table.name}
                        </label>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatBytes(table.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Export Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Export Mode
              </Label>
              <RadioGroup
                value={exportMode}
                onValueChange={(v: any) => setExportMode(v)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copy" id="mode-copy" />
                  <Label htmlFor="mode-copy" className="font-normal">COPY (Default)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="insert" id="mode-insert" />
                  <Label htmlFor="mode-insert" className="font-normal">INSERT statements</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Export Type */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Export Type
              </Label>
              <RadioGroup
                value={exportType}
                onValueChange={(v: any) => setExportType(v)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schema" id="type-schema" />
                  <Label htmlFor="type-schema" className="font-normal">Schema only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="type-both" />
                  <Label htmlFor="type-both" className="font-normal">Schema + Data</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStartDump}
            disabled={!pgDumpPath || selectedTables.length === 0 || !!pathError}
          >
            Start Dump
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
