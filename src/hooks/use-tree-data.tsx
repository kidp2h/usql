import * as React from "react";
import { Dot, Folder, Table, TableOfContents, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeDataItem } from "@/components/tree-view";
import { BiLogoPostgresql } from "react-icons/bi";
import { MdOutlineSchema } from "react-icons/md";
import { TbSql } from "react-icons/tb";


const NodeIcon = ({ icon: Icon, color, ...props }: any) => {
  if (!Icon) return null;
  return <Icon {...props} className={cn(props.className, color)} />;
};

const PostgresIcon = (props: any) => <NodeIcon {...props} icon={BiLogoPostgresql} color="text-blue-500" />;
const SchemaIcon = (props: any) => <NodeIcon {...props} icon={MdOutlineSchema} color="text-purple-500" />;
const TableIcon = (props: any) => <NodeIcon {...props} icon={Table} color="text-emerald-500" />;
const FolderIcon = (props: any) => <NodeIcon {...props} icon={Folder} color="text-amber-500" />;
const IndexIcon = (props: any) => <NodeIcon {...props} icon={TableOfContents} color="text-orange-500" />;
const QueryIcon = (props: any) => <NodeIcon {...props} icon={TbSql} color="text-sky-500" />;
const ColumnPrimaryIcon = (props: any) => <NodeIcon {...props} icon={KeyRound} color="text-yellow-500" />;
const ColumnForeignIcon = (props: any) => <NodeIcon {...props} icon={KeyRound} color="text-slate-400" />;
const ColumnDefaultIcon = (props: any) => <NodeIcon {...props} icon={Dot} color="text-slate-400" />;

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

  const [fileStats, setFileStats] = React.useState<Record<string, { size: number; mtimeMs: number }>>({});

  const allPaths = React.useMemo(() => {
    return connections.flatMap(conn => (conn as any).queryPaths || []).sort();
  }, [connections]);

  const allPathsKey = JSON.stringify(allPaths);

  React.useEffect(() => {
    if (allPaths.length === 0) return;

    const fetchStats = async () => {
      if (window.electron?.getFileStats) {
        const res = await window.electron.getFileStats(allPaths);
        if (res.ok && res.stats) {
          const statsMap: Record<string, { size: number; mtimeMs: number }> = {};
          for (const s of res.stats) {
            if (s.ok) {
              statsMap[s.filePath] = { size: s.size, mtimeMs: s.mtimeMs };
            }
          }
          setFileStats(prev => {
            const hasChanged = Object.keys(statsMap).some(key =>
              !prev[key] || prev[key].size !== statsMap[key].size || prev[key].mtimeMs !== statsMap[key].mtimeMs
            );
            return hasChanged ? { ...prev, ...statsMap } : prev;
          });
        }
      }
    };

    fetchStats();
  }, [allPathsKey]);

  const prevEnrichedRef = React.useRef<Map<string, TreeDataItem & { _originalConn: any; _queriesFingerprint: string }>>(new Map());

  const treeData = React.useMemo(() => {
    const newEnrichedMap = new Map<string, TreeDataItem & { _originalConn: any; _queriesFingerprint: string }>();

    const result = connections.map(conn => {
      // Calculate a fingerprint for the queries node to see if it changed
      const queriesFingerprint = (conn as any).queryPaths?.map((p: string) => fileStats[p]?.mtimeMs || 0).join(',') || '';

      const existing = prevEnrichedRef.current.get(conn.id);

      // If the original connection object reference is the same AND file stats for queries are same, reuse!
      if (existing && existing._originalConn === conn && existing._queriesFingerprint === queriesFingerprint) {
        newEnrichedMap.set(conn.id, existing);
        return existing;
      }

      // Create new queries node
      const queriesNode: TreeDataItem = {
        id: `${conn.id}:queries`,
        name: "Queries",
        count: (conn as any).queryPaths?.length || 0,
        children: (conn as any).queryPaths?.map((path: string) => {
          const fileName = path.split(/[/\\]/).pop() || path;
          const stats = fileStats[path];

          return {
            id: `${conn.id}:query:${path}`,
            name: fileName,
            path,
            mtimeMs: stats?.mtimeMs,
          };
        }) || [],
      };

      const enriched: TreeDataItem & { _originalConn: any; _queriesFingerprint: string } = {
        ...conn,
        children: [queriesNode, ...(conn.children || [])],
        _originalConn: conn,
        _queriesFingerprint: queriesFingerprint,
      };

      newEnrichedMap.set(conn.id, enriched);
      return enriched;
    });

    prevEnrichedRef.current = newEnrichedMap;
    return result;
  }, [connections, fileStats]);

  return { treeData, getTypeColor };
}

// Export themed icons for use in SidebarItem
export {
  PostgresIcon,
  SchemaIcon,
  TableIcon,
  FolderIcon,
  IndexIcon,
  QueryIcon,
  ColumnPrimaryIcon,
  ColumnForeignIcon,
  ColumnDefaultIcon,
};
