import { BINGO_COLUMNS, COLUMN_LABELS } from '../types';

// Generate a BINGO card (15 rows x 5 cols) using a card number for uniqueness
export function generateCard(cardNumber?: number): number[][] {
  if (cardNumber) {
    return getSeededCard(cardNumber);
  }
  const randomCard = Math.floor(Math.random() * 300) + 1;
  return getSeededCard(randomCard);
}

// Get all available card numbers (1-300)
export function getAvailableCards(): number[] {
  return Array.from({ length: 300 }, (_, i) => i + 1);
}

// Get a specific card by number using seeded randomness
export function getSeededCard(cardNumber: number): number[][] {
  const columns: number[][] = [];
  const seed = cardNumber * 7919;

  for (let col = 0; col < 5; col++) {
    const label = COLUMN_LABELS[col];
    const { min, max } = BINGO_COLUMNS[label];
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const shuffled = seededShuffle(nums, seed + col);
    columns.push(shuffled.slice(0, 5));
  }

  const rows: number[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        rowData.push(0); // Center standard FREE space
      } else {
        rowData.push(columns[col][row]);
      }
    }
    rows.push(rowData);
  }

  return rows;
}

// Seeded random for deterministic card generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  const random = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Draw next number from pool of undrawn numbers
export function drawNumber(drawnNumbers: number[]): number {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const remaining = allNumbers.filter(n => !drawnNumbers.includes(n));
  if (remaining.length === 0) throw new Error('All numbers drawn');
  return remaining[Math.floor(Math.random() * remaining.length)];
}

// Mark all called numbers on the card
export function markCard(card: number[][], drawnNumbers: number[]): boolean[][] {
  return card.map(row => row.map(cell => drawnNumbers.includes(cell)));
}

// Get winning cells
export function getWinningCells(card: number[][], drawnNumbers: number[]): boolean[][] {
  const rows = card.length;
  const cols = card[0]?.length || 5;
  const marked = markCard(card, drawnNumbers);
  const winning: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  for (let row = 0; row < rows; row++) {
    if (marked[row].every(cell => cell)) {
      for (let col = 0; col < cols; col++) winning[row][col] = true;
    }
  }
  for (let col = 0; col < cols; col++) {
    if (marked.every(row => row[col])) {
      for (let row = 0; row < rows; row++) winning[row][col] = true;
    }
  }

  return winning;
}

// Check win
export function checkWin(card: number[][], drawnNumbers: number[]): boolean {
  const rows = card.length;
  const cols = card[0]?.length || 5;
  const marked = markCard(card, drawnNumbers);
  for (let row = 0; row < rows; row++) {
    if (marked[row].every(cell => cell)) return true;
  }
  for (let col = 0; col < cols; col++) {
    if (marked.every(row => row[col])) return true;
  }
  return false;
}

// Generate game code
export function generateGameCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = Math.floor(100 + Math.random() * 900);
  return letters[Math.floor(Math.random() * letters.length)] + nums;
}

// Get column label for a number
export function getColumnLabel(num: number): string {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
}