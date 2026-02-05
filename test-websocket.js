/**
 * WebSocket Test Script
 *
 * 测试 WebSocket 服务器连接
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3001';
const TEST_DURATION = 30000; // 30 seconds

console.log('🔌 WebSocket Test - Oracle Monitor');
console.log(`Connecting to ${WS_URL}...\n`);

const ws = new WebSocket(WS_URL);

let messageCount = 0;
let startTime = Date.now();

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  console.log('📤 Sending subscription request for BTC/USD and ETH/USD...\n');

  // Subscribe to price feeds
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      symbols: ['BTC/USD', 'ETH/USD'],
      chain: 'ethereum',
    }),
  );
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  messageCount++;

  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 📨 Message #${messageCount}:`);
  console.log(JSON.stringify(message, null, 2));
  console.log('');
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Connection closed (code: ${code}, reason: ${reason})`);
  console.log(`\n📊 Test Summary:`);
  console.log(`  - Duration: ${(Date.now() - startTime) / 1000}s`);
  console.log(`  - Messages received: ${messageCount}`);
  process.exit(0);
});

// Close connection after test duration
setTimeout(() => {
  console.log('\n⏱️  Test duration reached, closing connection...');
  ws.close();
}, TEST_DURATION);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  ws.close();
});
