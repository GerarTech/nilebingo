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

module.exports = {
  calculateTotalStake,
  calculatePrizeAmount,
};
