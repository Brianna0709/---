import { MAJOR_ARCANA } from './major';
import { WANDS_CARDS } from './wands';
import { CUPS_CARDS } from './cups';
import { SWORDS_CARDS } from './swords';
import { PENTACLES_CARDS } from './pentacles';
import { Card } from '../types';

export const ALL_CARDS: Card[] = [
  ...MAJOR_ARCANA,
  ...WANDS_CARDS,
  ...CUPS_CARDS,
  ...SWORDS_CARDS,
  ...PENTACLES_CARDS
];

export function shuffleDeck<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
