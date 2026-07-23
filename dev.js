import { spawn } from 'child_process';

const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });
const client = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const killAll = () => {
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit();
};

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);
process.on('exit', killAll);
