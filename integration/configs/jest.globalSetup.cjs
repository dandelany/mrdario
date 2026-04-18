const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const PID_FILE = path.join(__dirname, '.jest-server-pid');
const LOG_FILE = path.join(__dirname, '.jest-server.log');
const ERR_FILE = path.join(__dirname, '.jest-server.err.log');
const REPO_ROOT = path.resolve(__dirname, '../..');
const SOCKET_ROOT = path.join(REPO_ROOT, 'integration', '.socketcluster');
const PORT = 8118;
const ENV_CMD = path.join(REPO_ROOT, 'node_modules/.bin/env-cmd');
const TS_NODE = path.join(REPO_ROOT, 'node_modules/.bin/ts-node');

function waitForPort(port, timeoutMs) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();

      socket
        .once('connect', () => {
          socket.destroy();
          resolve();
        })
        .once('error', () => {
          socket.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`timed out waiting for test server on port ${port}`));
          } else {
            setTimeout(tryConnect, 250);
          }
        })
        .connect(port, '127.0.0.1');
    };

    tryConnect();
  });
}

module.exports = async () => {
  fs.mkdirSync(SOCKET_ROOT, { recursive: true });
  const out = fs.openSync(LOG_FILE, 'w');
  const err = fs.openSync(ERR_FILE, 'w');
  const child = spawn(
    process.execPath,
    [ENV_CMD, '-f', 'server/.test.env', TS_NODE, 'server/src/server.ts'],
    {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ['ignore', out, err],
      env: {
        ...process.env,
        SOCKETCLUSTER_OPTIONS: JSON.stringify({
          socketRoot: SOCKET_ROOT,
        }),
      },
    }
  );

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));

  try {
    await waitForPort(PORT, 20000);
  } catch (error) {
    let extra = '';
    if (fs.existsSync(LOG_FILE)) {
      extra += `\nstdout:\n${fs.readFileSync(LOG_FILE, 'utf8')}`;
    }
    if (fs.existsSync(ERR_FILE)) {
      extra += `\nstderr:\n${fs.readFileSync(ERR_FILE, 'utf8')}`;
    }
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (_) {}
    throw new Error(`${error.message}${extra}`);
  }
};
