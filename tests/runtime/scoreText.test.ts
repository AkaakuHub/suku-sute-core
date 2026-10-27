import { expect, test } from 'vite-plus/test';
import { formatLiveLoveScore } from '../../src/runtime/live/scoreText.ts';

test('Live LOVEはruntimeのcustom numeric formatで12桁と桁区切りを表示する', () => {
  expect(formatLiveLoveScore(0)).toBe('000,000,000,000');
  expect(formatLiveLoveScore(123)).toBe('000,000,000,123');
  expect(formatLiveLoveScore(5_074_693_189_631_943)).toBe('5,074,693,189,631,943');
  expect(formatLiveLoveScore(18_446_744_073_709_551_615n)).toBe('18,446,744,073,709,551,615');
});
