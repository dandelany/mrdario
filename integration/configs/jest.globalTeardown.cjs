const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(__dirname, '.jest-server-pid');
const LOG_FILE = path.join(__dirname, '.jest-server.log');
const ERR_FILE = path.join(__dirname, '.jest-server.err.log');

module.exports = async () => {
  if (!fs.existsSync(PID_FILE)) {
    return;
  }

  const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
  fs.unlinkSync(PID_FILE);

  if (!pid) {
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (_) {}

  for (const filePath of [LOG_FILE, ERR_FILE]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
