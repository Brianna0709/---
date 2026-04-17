/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Card {
  name: string;
  number: string;
  suit: string;
  symbol: string;
  element: string;
  upright: string[];
  reversed: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  colors: [string, string];
}

export type SpreadType = 'single' | 'three' | 'celtic';

export interface SpreadPosition {
  title: string;
  description: string;
}

export const SPREADS: Record<SpreadType, SpreadPosition[]> = {
  single: [
    { title: '核心启示', description: '此刻你最需要关注的能量或方向。' }
  ],
  three: [
    { title: '过去', description: '问题的根源或已发生的影响。' },
    { title: '现在', description: '当前的现状与面临的情境。' },
    { title: '未来', description: '如果你沿现状前进，可能的发展。' }
  ],
  celtic: [
    { title: '现状', description: '此刻问题的中心。' },
    { title: '挑战', description: '横跨在前的阻碍。' },
    { title: '根基', description: '潜意识或遥远的过去。' },
    { title: '过去', description: '正在离去的影响。' },
    { title: '目标', description: '最佳可能性或意识层面的想法。' },
    { title: '近期', description: '即将到来的能量。' },
    { title: '自我', description: '你对自己的看法。' },
    { title: '环境', description: '周围的人与外界影响。' },
    { title: '希望与恐惧', description: '你内在的预期。' },
    { title: '终局', description: '最终的指引与结论。' }
  ]
};
