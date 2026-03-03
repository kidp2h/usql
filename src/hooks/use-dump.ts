import { DumpOptions, DumpResult } from "@/lib/pg-dump"
import { useState } from "react"

export function useDump() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DumpResult | null>(null)

  const dump = async (options: DumpOptions) => {
    setResult(null)
    setLoading(true)
    try {
      const res = await window.electron.dumpPostgres(options)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return { dump, result, loading }
}