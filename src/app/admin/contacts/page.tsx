'use client';

import { useEffect, useState } from 'react';
import { Phone, Download, User as UserIcon, Check } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/data?action=contacts')
      .then(r => r.json())
      .then(d => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ['Name', 'Username', 'Phone', 'Telegram ID', 'Language', 'Date'];
    const rows = contacts.map((c: any) => [
      c.first_name || '',
      c.username || '',
      c.phone || '',
      c.telegram_id,
      c.language,
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading contacts...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Contacts</h1>
        <button onClick={exportCSV} className="bg-gold text-navy font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-500">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Username</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-center p-3 font-medium">Verified</th>
                <th className="text-center p-3 font-medium">Language</th>
                <th className="text-right p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
                        <UserIcon size={14} className="text-navy" />
                      </div>
                      <span className="text-white font-medium">{c.first_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400">{c.username ? `@${c.username}` : '-'}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-white">
                      <Phone size={12} className="text-gold" /> {c.phone}
                    </span>
                  </td>
                  <td className="p-3 text-center">{c.verified ? <Check size={14} className="text-gold mx-auto" /> : '-'}</td>
                  <td className="p-3 text-center uppercase text-gray-400">{c.language}</td>
                  <td className="p-3 text-right text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No contacts with phone numbers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}