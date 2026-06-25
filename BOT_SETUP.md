# Telegram Bot Setup - Quick Guide

## Your Bot Tokens:
- **Main Bot**: `8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE`
- **Admin Bot**: `1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M`

## Step 1: Get Your Telegram Chat ID

**Option A - Using @userinfobot:**
1. Open Telegram
2. Search for `@userinfobot`
3. Send any message
4. Bot replies with your Chat ID (e.g., `123456789`)
5. Copy that number

**Option B - Using @getidsbot:**
1. Search for `@getidsbot`
2. Start the bot
3. It shows your Chat ID

## Step 2: Update .env.local

Open `.env.local` and replace:
```
ADMIN_CHAT_ID=YOUR_ADMIN_CHAT_ID
```

With your actual chat ID:
```
ADMIN_CHAT_ID=123456789
```

## Step 3: Set Webhooks

Open these URLs in your browser (press Enter after each):

### Main Bot Webhook:
```
https://api.telegram.org/bot8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE/setWebhook?url=https://bingo.vercel.app/api/public/telegram/webhook
```

**Expected response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Admin Bot Webhook:
```
https://api.telegram.org/bot1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M/setWebhook?url=https://bingo.vercel.app/api/admin/telegram/webhook
```

**Expected response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 4: Verify Webhooks

Check if webhooks are set correctly:

### Main Bot:
```
https://api.telegram.org/bot8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE/getWebhookInfo
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://bingo.vercel.app/api/public/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Admin Bot:
```
https://api.telegram.org/bot1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M/getWebhookInfo
```

## Step 5: Test the Bots

### Test Main Bot:
1. Find your bot on Telegram (search for the bot username you created with @BotFather)
2. Send `/start`
3. You should receive:
   - Welcome message
   - "Share Phone Number" button
4. Tap the button and share your contact
5. Admin should receive notification

### Test Admin Bot:
1. Find your admin bot on Telegram
2. Send `/admin_stats`
3. You should see dashboard statistics

## Step 6: Redeploy to Vercel

After updating `.env.local` with your Chat ID:

```bash
git add .env.local
git commit -m "Update admin chat ID"
git push
```

Or redeploy manually from Vercel dashboard.

## Common Issues:

### ❌ Bot not responding:
**Solution:** 
1. Check webhook is set (Step 4)
2. Make sure app is deployed on Vercel
3. Check Vercel logs for errors

### ❌ "Webhook not set" error:
**Solution:** 
1. Copy the webhook URL from Step 3
2. Paste in browser and press Enter
3. Should see `{"ok":true,...}`

### ❌ Contact sharing not working:
**Solution:**
1. Make sure you tap the "Share Phone Number" button
2. Don't just type your phone number
3. Check that ADMIN_CHAT_ID is correct in .env.local

### ❌ Admin commands not working:
**Solution:**
1. Make sure you're sending from the admin chat ID
2. Check that ADMIN_BOT_TOKEN is correct
3. Verify admin bot webhook is set

## Quick Checklist:
- [ ] Got your Telegram Chat ID
- [ ] Updated ADMIN_CHAT_ID in .env.local
- [ ] Set main bot webhook
- [ ] Set admin bot webhook
- [ ] Verified both webhooks are active
- [ ] Redeployed to Vercel
- [ ] Tested /start on main bot
- [ ] Tested /admin_stats on admin bot

## Need Help?

If bots still not working:
1. Check Vercel deployment logs
2. Verify webhook URLs are correct
3. Make sure bot tokens are valid
4. Ensure ADMIN_CHAT_ID is a number (not text)

## Your Current Configuration:
- **Live URL**: https://bingo.vercel.app
- **Main Bot Token**: 8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE
- **Admin Bot Token**: 1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M
- **ADMIN_CHAT_ID**: YOUR_ADMIN_CHAT_ID ⚠️ (needs to be updated!)

**Action Required:** Replace `YOUR_ADMIN_CHAT_ID` with your actual Telegram chat ID number!