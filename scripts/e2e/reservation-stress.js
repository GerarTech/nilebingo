// Simple concurrency test: fire many toggle_card requests concurrently
// Usage: NODE_ENV=development node scripts/e2e/reservation-stress.js

const fetch = global.fetch || require('node-fetch');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const GAME_ID = process.env.GAME_ID || 'TESTGAME123';
const USER_PREFIX = '00000000-0000-0000-0000-';
const NUM_USERS = parseInt(process.env.USERS || '50', 10);
const CARD_NUMBER = parseInt(process.env.CARD || '1', 10);

async function toggle(userId) {
  const res = await fetch(`${BASE}/api/public/game/lobby`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_card', gameId: GAME_ID, userId, cardNumber: CARD_NUMBER })
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

(async function main() {
  console.log('Starting reservation stress test', { BASE, GAME_ID, NUM_USERS, CARD_NUMBER });
  const users = Array.from({ length: NUM_USERS }, (_, i) => USER_PREFIX + String(100000 + i));
  const promises = users.map(u => toggle(u));
  const results = await Promise.all(promises);
  const success = results.filter(r => r.status === 200 && r.body && r.body.success).length;
  const conflicts = results.filter(r => r.status === 409).length;
  console.log('Results:', { total: results.length, success, conflicts });
  console.log('Sample results:', results.slice(0, 10));
})();
