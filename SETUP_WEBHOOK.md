# Set Telegram Bot Webhook (No Local Network Needed)

## The Issue:
Your local network blocks Telegram API (connection timeout). **This is normal** - you can still set up the bot using your browser.

## Step 1: Set Main Bot Webhook

**Copy this URL and paste it in your browser address bar, then press Enter:**

```
https://api.telegram.org/bot8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE/setWebhook?url=https://bingo-roan-beta.vercel.app/api/public/telegram/webhook
```

**You should see this response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

If you see this, ✅ **Success!**

## Step 2: Set Admin Bot Webhook

**Copy and paste this URL in your browser:**

```
https://api.telegram.org/bot1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M/setWebhook?url=https://bingo-roan-beta.vercel.app/api/admin/telegram/webhook
```

**You should see:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 3: Verify Webhooks Are Set

**Check main bot:**
```
https://api.telegram.org/bot8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE/getWebhookInfo
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://bingo-roan-beta.vercel.app/api/public/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": ""
  }
}
```

**Check admin bot:**
```
https://api.telegram.org/bot1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M/getWebhookInfo
```

## Step 4: Update ADMIN_CHAT_ID in .env.local

**You MUST do this step!**

1. Open Telegram
2. Search for `@userinfobot`
3. Send any message
4. It will reply with your Chat ID (e.g., `123456789`)
5. Open `.env.local` file
6. Replace `ADMIN_CHAT_ID=YOUR_ADMIN_CHAT_ID` with `ADMIN_CHAT_ID=123456789` (use your actual number)
7. Save the file

## Step 5: Redeploy to Vercel

After updating `.env.local`:

**Option A - Using Git:**
```bash
git add .env.local
git commit -m "Add admin chat ID"
git push
```

**Option B - Vercel Dashboard:**
1. Go to https://vercel.com/gerartechs-projects/bingo/hjwvqJSXzPgxpCkHgbC8HVjCaJq6
2. Go to Settings → Environment Variables
3. Add/Update `ADMIN_CHAT_ID` with your chat ID
4. Redeploy the project

## Step 6: Test the Bot

### Test Main Bot:
1. Open Telegram
2. Search for your bot username (the one you created with @BotFather)
3. Send `/start`
4. You should receive:
   - Welcome message: "🎰 Welcome to Nile Bingo!"
   - A button: "📱 Share Phone Number"
5. Tap the button and share your contact

### Test Admin Bot:
1. Search for your admin bot username
2. Send `/admin_stats`
3. You should see dashboard statistics

## Troubleshooting:

### ❌ Still not working after setup:

**Check Vercel Logs:**
1. Go to https://vercel.com/gerartechs-projects/bingo/hjwvqJSXzPgxpCkHgbC8HVjCaJq6
2. Click on your project
3. Go to "Logs" or "Deployments"
4. Check for errors

**Common Issues:**
1. **ADMIN_CHAT_ID not updated**: Make sure you replaced `YOUR_ADMIN_CHAT_ID` with an actual number
2. **Webhook not set**: Repeat Step 1 and 2, make sure you see the success message
3. **Bot token wrong**: Double-check the tokens in `.env.local`
4. **Vercel not deployed**: Make sure the latest version is deployed

### ❌ "Webhook not set" when testing:

**Solution:** The webhook URL might have special characters that need encoding. Try this instead:

1. Go to: https://api.telegram.org/bot8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE/setWebhook
2. You'll see a form
3. Enter this in the "url" field: `https://bingo-roan-beta.vercel.app/api/public/telegram/webhook`
4. Click "Send"

### ❌ Bot responds but no contact sharing:

**Solution:** 
1. Make sure you TAP the "Share Phone Number" button
2. Don't type your phone number manually
3. The button should trigger Telegram's contact sharing feature

## Quick Summary:

1. ✅ Set main bot webhook (browser URL #1)
2. ✅ Set admin bot webhook (browser URL #2)
3. ✅ Get your Telegram chat ID from @userinfobot
4. ✅ Update ADMIN_CHAT_ID in .env.local
5. ✅ Redeploy to Vercel
6. ✅ Test by sending /start to your bot

## Your Webhook URLs:

**Main Bot:**
```
https://bingo-roan-beta.vercel.app/api/public/telegram/webhook
```

**Admin Bot:**
```
https://bingo-roan-beta.vercel.app/api/admin/telegram/webhook
```

## Your Bot Tokens:

**Main Bot:** `8248243239:AAHFs6GDOWbJgKASXbgKl2y_XkN_XN33CYE`

**Admin Bot:** `1749283201:AAHfG2uSZBZ2UgziLUjW6R1u3GqZBEuqp4M`

---

**Note:** The local network timeout is expected. All bot setup is done through your browser and Telegram, not through local scripts.