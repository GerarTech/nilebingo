'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'broadcast', message: message.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Broadcast Message</h1>

      <div className="glass rounded-xl p-4 max-w-lg">
        <p className="text-xs text-gray-400 mb-3">
          Send a message to all users via the Telegram bot. This will send a direct message to every registered user.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your broadcast message here..."
          rows={6}
          className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold/50 resize-none"
        />

        <button
          onClick={handleBroadcast}
          disabled={sending || !message.trim()}
          className="w-full mt-3 bg-gold text-navy font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending ? (
            'Sending...'
          ) : (
            <>
              <Send size={16} />
              Send Broadcast
            </>
          )}
        </button>

        {result && (
          <div className="mt-3 p-3 bg-navy rounded-xl">
            <div className="text-xs text-green-400">✓ Sent to {result.sent} users</div>
            {result.failed > 0 && <div className="text-xs text-red-400">✗ Failed for {result.failed} users</div>}
          </div>
        )}
      </div>
    </div>
  );
}