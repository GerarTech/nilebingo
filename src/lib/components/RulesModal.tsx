'use client';

import { Info, Target, List, Crown, Swords, X } from 'lucide-react';

interface RulesModalProps {
  show: boolean;
  onClose: () => void;
  t: (key: string) => string;
  rulesText?: string;
}

export default function RulesModal({ show, onClose, t, rulesText }: RulesModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-navy-card rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gold flex items-center gap-2"><Info size={20} />{t('how_to_play')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>
        {rulesText ? (
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: rulesText }} />
        ) : (
          <div className="space-y-5">
            {[
              { icon: <Target size={16} className="text-gold" />, bg: 'bg-gold/20', title: t('objective'), desc: t('objective_desc') },
              { icon: <List size={16} className="text-accent-green" />, bg: 'bg-accent-green/20', title: t('gameplay'), desc: t('gameplay_desc') },
              { icon: <Crown size={16} className="text-accent-blue" />, bg: 'bg-accent-blue/20', title: t('winning'), desc: t('winning_desc') },
              { icon: <Swords size={16} className="text-accent-violet" />, bg: 'bg-accent-violet/20', title: t('stakes'), desc: t('stakes_desc') },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-6 bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold-dark">{t('got_it')}</button>
      </div>
    </div>
  );
}
