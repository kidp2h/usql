import {Connection} from "@/stores/sidebar-store";
import {TableSchema} from "@/lib/suggestions";

export function buildCmSchema(tables: TableSchema[]): Record<string, string[]> {
    return tables.reduce((acc, table) => {
        acc[table.name] = table.columns
        return acc
    }, {} as Record<string, string[]>)
}