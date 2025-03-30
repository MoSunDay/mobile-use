/* eslint-disable no-console */
// Polyfill TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add additional web API polyfills needed for agent tests
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
}

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Set timeout long enough for all tests including agent tests
jest.setTimeout(300000); // 5 minutes

const passthrough =
  method =>
  (...args) => {
    process.stdout.write(args.join(' ') + '\n');
  };

console.log = passthrough('log');
console.info = passthrough('info');
console.warn = passthrough('warn');
console.error = passthrough('error');
console.debug = passthrough('debug');
