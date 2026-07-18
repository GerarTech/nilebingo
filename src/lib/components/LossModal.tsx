'use client';

import BingoGrid from './BingoGrid';

interface LossModalProps {
  show: boolean;
  opponentName: string;
  stake: number;
  livePlayerCount: number;
  commissionRate: number;
  prizePool: number;
  gameCards: number[][][];
  cardNumbers: number[];
  drawnNumbers: number[];
  countdown: number | null;
  onSkip: () => void;
  t: (key: string) => string;
  opponentWinningCards?: number[][][];
}

export default function LossModal({
  show, opponentName, stake, livePlayerCount, commissionRate, prizePool,
  gameCards, cardNumbers, drawnNumbers, countdown, onSkip, t,
  opponentWinningCards = [],
}: LossModalProps) {
  if (!show) return null;

  const winAmount = prizePool || stake * livePlayerCount * (1 - commissionRate / 100);

  return (
    <div
      className="fixed inset-0 bg-[#050e18] z-50 flex flex-col justify-between p-6 overflow-y-auto font-sans text-white animate-fade-in"
      onClick={onSkip}
    >
      <div className="flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="text-xs font-black text-gray-400 hover:text-white bg-[#141f33] border border-gold-subtle px-3.5 py-1.5 rounded-xl transition-all uppercase cursor-pointer gold-border-hover"
        >
          Skip {countdown !== null && `(${countdown}s)`}
        </button>
      </div>

      <div className="max-w-sm w-full mx-auto my-auto space-y-6" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-3xl animate-bounce inline-block">😢</span>
          <h1 className="text-2xl font-black text-red-500 tracking-tight uppercase mt-1 drop-shadow-md">
            GAME OVER!
          </h1>
          <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest">
            OPPONENT CLAIMED JACKPOT
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-[#141f33]/80 border border-gold-medium px-5 py-4 rounded-2xl shadow-gold-glow-sm gold-border-hover">
            <span className="font-extrabold text-gold text-sm tracking-wide flex items-center gap-1.5">
              <span>👑</span> {opponentName}
            </span>
            <span className="font-black text-gold text-sm">
              +{winAmount.toLocaleString()} {t('birr')}
            </span>
          </div>
          <div className="flex items-center justify-between bg-[#141f33]/80 border border-gold-subtle opacity-50 px-5 py-4 rounded-2xl">
            <span className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5 font-sans">
              <span>👤</span> You
            </span>
            <span className="font-black text-gray-400 text-sm">
              +0 {t('birr')}
            </span>
          </div>
        </div>

        {opponentWinningCards && opponentWinningCards.length > 0 && (
          <div className="space-y-2">
            <div className="text-[9px] font-black uppercase text-amber-400 tracking-widest text-center flex items-center justify-center gap-1.5 bg-amber-500/10 py-1.5 rounded-xl border border-amber-500/20">
              🏆 {opponentName}&apos;s Winning Card
            </div>
            {opponentWinningCards.map((card, cIndex) => (
              <div key={`opp-${cIndex}`} className="bg-[#1c120c]/60 border border-amber-500/40 p-4 rounded-3xl shadow-xl">
                <BingoGrid card={card} drawnNumbers={drawnNumbers} compact={true} />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {opponentWinningCards && opponentWinningCards.length > 0 && (
            <div className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">
              Your Card{gameCards.length > 1 ? 's' : ''}
            </div>
          )}
          {gameCards.map((card, cIndex) => (
            <div key={`user-${cIndex}`} className="bg-[#141f33]/40 border border-gold-subtle p-4 rounded-3xl shadow-xl opacity-85">
              <BingoGrid card={card} drawnNumbers={drawnNumbers} compact={true} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-sm w-full mx-auto mt-auto pt-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-[10px] uppercase font-black tracking-widest text-gold tracking-wide select-none animate-pulse">
            STARTING IN {countdown ?? 3}S
          </div>
          <div className="w-full bg-[#141f33] h-2.5 rounded-full overflow-hidden mt-2.5 border border-gold-subtle shadow-inner">
            <div
              className="bg-gradient-gold h-full rounded-full transition-all duration-1000 ease-linear shadow-gold-glow-sm"
              style={{ width: `${((countdown ?? 5) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
