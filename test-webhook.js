const https = require('https');

const BOT_TOKEN = '8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE';
const WEBHOOK_URL = 'https://bingo.vercel.app/api/public/telegram/webhook';

console.log('🔍 Testing Telegram Bot Webhook...\n');

// Test 1: Check webhook info
console.log('1. Checking current webhook status...');
https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const info = JSON.parse(data);
    console.log('Webhook Info:', JSON.stringify(info, null, 2));
    
    if (info.result.url === WEBHOOK_URL) {
      console.log('✅ Webhook URL is correct!');
    } else {
      console.log('❌ Webhook URL mismatch!');
      console.log('Expected:', WEBHOOK_URL);
      console.log('Actual:', info.result.url);
    }
    
    if (info.result.pending_update_count > 0) {
      console.log(`⚠️  Pending updates: ${info.result.pending_update_count}`);
    }
    
    // Test 2: Send a test message to the bot
    console.log('\n2. Testing bot response...');
    console.log('Please send /start to your bot on Telegram now...');
    console.log('Waiting 5 seconds for updates...\n');
    
    setTimeout(() => {
      console.log('3. Checking for recent updates...');
      https.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=5`, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const updates = JSON.parse(data2);
          console.log('Recent updates:', JSON.stringify(updates.result, null, 2));
          
          if (updates.result.length === 0) {
            console.log('\n❌ No updates found. Possible issues:');
            console.log('1. Webhook not receiving updates');
            console.log('2. Bot token is incorrect');
            console.log('3. Vercel deployment is down');
            console.log('4. Webhook URL is wrong');
          } else {
            console.log('\n✅ Updates found! Bot is receiving messages.');
          }
        });
      });
    }, 5000);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});