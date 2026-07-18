function calculateTotalStake(stakeAmountPerCard, cardCount) {
  const perCard = Number(stakeAmountPerCard || 0);
  const cards = Math.max(1, Number(cardCount || 1));
  return perCard * cards;
}

function calculatePrizeAmount({ stakeAmountPerCard, cardCount, commissionRate = 15, outcome = 'win' }) {
  const totalStake = calculateTotalStake(stakeAmountPerCard, cardCount);
  if (outcome !== 'win') return -totalStake;

  const commission = Math.max(0, Math.min(100, Number(commissionRate || 0)));
  return totalStake * (1 - commission / 100);
}

/**
 * Calculates the exact win amount for a winner.
 * Uses total_stake and commission from the game record, or falls back to calculated values.
 */
function calculateWinnerShare(gameRecord, totalStakeFallback, winnerCount = 1, winnerIndex = 0) {
  const commissionRate = gameRecord && typeof gameRecord.commission === 'number'
    ? gameRecord.commission
    : 15;

  let totalStake = totalStakeFallback;
  if (gameRecord) {
    if (typeof gameRecord.total_stake === 'number' && gameRecord.total_stake > 0) {
      totalStake = gameRecord.total_stake;
    } else if (typeof gameRecord.total_cards === 'number' && gameRecord.total_cards > 0 && typeof gameRecord.stake_amount === 'number') {
      totalStake = gameRecord.total_cards * gameRecord.stake_amount;
    } else if (typeof gameRecord.prize_pool === 'number' && gameRecord.prize_pool > 0) {
      totalStake = gameRecord.prize_pool / (1 - commissionRate / 100);
    }
  }

  totalStake = Number(totalStake) || 0;
  const calculatedPrizePool = Math.round(totalStake * (1 - commissionRate / 100));
  const winnersCount = Math.max(1, Number(winnerCount) || 1);
  const baseShare = Math.floor(calculatedPrizePool / winnersCount);
  const remainder = calculatedPrizePool - (baseShare * winnersCount);

  return winnerIndex === 0 ? baseShare + remainder : baseShare;
}

/**
 * Calculates the post-game wallet balance for a winner.
 */
function calculatePostGameWalletBalance(gameRecord, currentBalance, totalStakeFallback, winnerCount = 1, winnerIndex = 0) {
  const currentVal = Number(currentBalance) || 0;
  const share = calculateWinnerShare(gameRecord, totalStakeFallback, winnerCount, winnerIndex);
  return currentVal + share;
}

module.exports = {
  calculateTotalStake,
  calculatePrizeAmount,
  calculateWinnerShare,
  calculatePostGameWalletBalance,
};

