import { spawn } from "node:child_process";

const DEV_URL = "http://localhost:3000";

const devServer = spawn("bunx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DISABLE_TURBOPACK: "1",
  },
});

let electronProcess;

async function waitForServer(url, retries = 120, delayMs = 500) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until server is up.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function startElectron() {
  await waitForServer(DEV_URL);

  electronProcess = spawn("bunx", ["electron", "."], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ELECTRON_START_URL: DEV_URL,
    },
  });
}

function cleanup() {
  if (electronProcess) {
    electronProcess.kill();
  }

  devServer.kill();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

startElectron().catch((error) => {
  console.error(error);
  cleanup();
  process.exit(1);
});
