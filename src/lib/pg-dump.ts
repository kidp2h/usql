import { spawn } from 'child_process'

export interface DumpOptions {
  pgDumpPath: string     // user đã chọn sẵn
  host: string
  port: number
  user: string
  password: string
  database: string
  outputPath: string

  // Filter
  schema?: string
  tables?: string[]

  // Content
  schemaOnly?: boolean
  dataOnly?: boolean

  // Format
  format?: 'plain' | 'custom' | 'tar' | 'directory'

  // Extras
  noOwner?: boolean
  noPrivileges?: boolean
  clean?: boolean
  ifExists?: boolean
}

export interface DumpResult {
  success: boolean
  path?: string
  durationMs?: number
  error?: string
}

export function dumpPostgres(
  options: DumpOptions,
  onProgress?: (line: string) => void
): Promise<DumpResult> {
  const {
    pgDumpPath,
    host, port, user, password, database, outputPath,
    schema, tables,
    schemaOnly, dataOnly,
    format = 'plain',
    noOwner = true,
    noPrivileges = false,
    clean = true,
    ifExists = true,
  } = options

  return new Promise((resolve) => {
    const args: string[] = [
      '--host', host,
      '--port', String(port),
      '--username', user,
      '--dbname', database,
      '--format', format,
      '--file', outputPath,
      '--verbose',
    ]

    if (schemaOnly)         args.push('--schema-only')
    else if (dataOnly)      args.push('--data-only')

    if (clean && !dataOnly) args.push('--clean')
    if (ifExists)           args.push('--if-exists')
    if (noOwner)            args.push('--no-owner')
    if (noPrivileges)       args.push('--no-privileges')

    if (schema)             args.push('--schema', schema)
    tables?.forEach(t =>    args.push('--table', t))

    // pg_dump nhận password qua env, không phải args
    const env = { ...process.env, PGPASSWORD: password }
    const start = Date.now()
    const child = spawn(pgDumpPath, args, { env })

    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString()
      stderr += line
      // --verbose gửi progress qua stderr (không phải lỗi)
      onProgress?.(line.trim())
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, path: outputPath, durationMs: Date.now() - start })
      } else {
        resolve({ success: false, error: stderr })
      }
    })

    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}