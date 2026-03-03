import * as React from "react";
import { Dot, Folder, Database, SwatchBook, Table, TableOfContents, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeDataItem } from "@/components/tree-view";

export function useTreeData(connections: TreeDataItem[]) {
  const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('serial')) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (t.includes('char') || t.includes('text') || t.includes('varchar')) return "text-green-500 bg-green-500/10 border-green-500/20";
    if (t.includes('bool')) return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    if (t.includes('time') || t.includes('date')) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (t.includes('json') || t.includes('xml')) return "text-teal-500 bg-teal-500/10 border-teal-500/20";
    if (t.includes('num') || t.includes('dec') || t.includes('double') || t.includes('float')) return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
    return "text-muted-foreground bg-muted border-border";
  };

  const getTreeDataWithIcons = React.useCallback((nodes: TreeDataItem[], level = 0): TreeDataItem[] => {
    return nodes.map(node => {
      let icon = Database;

      if (node.id.includes(':schema:')) icon = SwatchBook;
      if (node.id.includes(':table:')) icon = Table;
      if (node.id.includes(':columns') || node.id.includes(':indexes')) icon = Folder;
      if (node.id.includes(':index:')) icon = TableOfContents;

      if (node.id.includes(':column:')) {
        if ((node as any).isPrimary) {
          return {
            ...node,
            icon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")
            } />,
            openIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")
            } />,
            selectedIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-yellow-500")} />,
            children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined,
          };
        }
        if ((node as any).isForeign) {
          return {
            ...node,
            icon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            openIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            selectedIcon: (props: any) => <KeyRound {...props} className={cn(props.className, "text-slate-900 dark:text-slate-400")} />,
            children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined,
          };
        }
        icon = Dot;
      }

      return {
        ...node,
        icon,
        openIcon: icon,
        selectedIcon: icon,
        children: node.children ? getTreeDataWithIcons(node.children, level + 1) : undefined,
      };
    });
  }, []);

  const treeData = React.useMemo(
    () => getTreeDataWithIcons(connections),
    [connections, getTreeDataWithIcons],
  );

  return { treeData, getTypeColor };
}