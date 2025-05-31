#!/usr/bin/env node

// Simple dev server runner
const { spawn } = require('child_process');
const path = require('path');

// Set environment to development
process.env.NODE_ENV = 'development';

// Find next binary
const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');

// Run next dev
const next = spawn(process.platform === 'win32' ? 'next.cmd' : 'next', ['dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

next.on('error', (err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});

next.on('exit', (code) => {
  process.exit(code);
});