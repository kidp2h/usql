const { spawn } = require("child_process");

function dumpPostgres(options, onProgress) {
  const {
    pgDumpPath,
    host,
    port,
    user,
    password,
    database,
    outputPath,
    schema,
    tables,
    schemaOnly,
    dataOnly,
    format = "plain",
    noOwner = true,
    noPrivileges = false,
    clean = true,
    ifExists = true,
  } = options;

  return new Promise((resolve) => {
    const args = [
      "--host",
      host,
      "--port",
      String(port),
      "--username",
      user,
      "--dbname",
      database,
      "--format",
      format,
      "--file",
      outputPath,
      "--verbose",
    ];

    if (schemaOnly) args.push("--schema-only");
    else if (dataOnly) args.push("--data-only");

    if (clean && !dataOnly) args.push("--clean");
    if (ifExists) args.push("--if-exists");
    if (noOwner) args.push("--no-owner");
    if (noPrivileges) args.push("--no-privileges");

    if (schema) args.push("--schema", schema);
    tables?.forEach((t) => args.push("--table", t));

    const env = { ...process.env, PGPASSWORD: password };
    const start = Date.now();
    const child = spawn(pgDumpPath, args, { env });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      const line = chunk.toString();
      stderr += line;
      if (onProgress) onProgress(line.trim());
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          path: outputPath,
          durationMs: Date.now() - start,
        });
      } else {
        resolve({ success: false, error: stderr });
      }
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

module.exports = { dumpPostgres };
