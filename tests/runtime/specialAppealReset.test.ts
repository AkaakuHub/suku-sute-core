import { expect, test } from 'vite-plus/test';
import {
  applyLiveSpecialAppealReset,
  createLiveSpecialAppealResetEffect,
  type LiveSpecialAppealResetState,
} from '../../src/runtime/cards/specialAppealReset.ts';

const sourceCard = card(1001, 1031, [101]);
const otherCard = card(1002, 1032, [101]);
const outsideUnitCard = card(1003, 1041, [102]);

test('ActionType55の通常・EX両方をunit対象で再使用可能にする', () => {
  const result = applyLiveSpecialAppealReset(state(), resetEffect(3, 3, 101), {
    kind: 'card-skill',
    card: sourceCard,
  });

  expect(result.specialAppeal?.used).toBe(false);
  expect(result.exSpecialAppeals.map(({ token }) => token.remainCoolTimeSeconds)).toEqual([
    0, 0, 5,
  ]);
});

test('通常Special Appeal自身の発動ではruntime同様に自身の使用済み状態を維持する', () => {
  const result = applyLiveSpecialAppealReset(state(), resetEffect(1, 4, 0), {
    kind: 'special-appeal',
    card: sourceCard,
  });

  expect(result.specialAppeal?.used).toBe(true);
});

test('EX Special Appeal自身はself対象でcooldownを解除する', () => {
  const result = applyLiveSpecialAppealReset(state(), resetEffect(2, 4, 0), {
    kind: 'ex-special-appeal',
    card: otherCard,
  });

  expect(result.exSpecialAppeals.map(({ token }) => token.remainCoolTimeSeconds)).toEqual([
    5, 0, 5,
  ]);
});

test('memberとothersのruntime対象判定をCardId単位で適用する', () => {
  const member = applyLiveSpecialAppealReset(state(), resetEffect(3, 2, 1032), {
    kind: 'card-skill',
    card: sourceCard,
  });
  expect(member.exSpecialAppeals.map(({ token }) => token.remainCoolTimeSeconds)).toEqual([
    5, 0, 5,
  ]);

  const others = applyLiveSpecialAppealReset(state(), resetEffect(3, 5, 0), {
    kind: 'card-skill',
    card: sourceCard,
  });
  expect(others.specialAppeal?.used).toBe(true);
  expect(others.exSpecialAppeals.map(({ token }) => token.remainCoolTimeSeconds)).toEqual([
    5, 0, 0,
  ]);
});

function state(): LiveSpecialAppealResetState {
  return {
    specialAppeal: { card: sourceCard, used: true },
    exSpecialAppeals: [sourceCard, otherCard, outsideUnitCard].map((candidate, index) => ({
      card: candidate,
      token: {
        coolTimeSeconds: 5,
        remainCoolTimeSeconds: 5,
        generationsId: 1,
        tokenCardSetRecord: {
          id: index + 1,
          specialAppealTokenSetId: 1,
          specialAppealTokenResourceId: 2001 + index,
          targetParameter: candidate.charactersId,
          skillSeriesId: 1,
          mood: 1,
          style: 1,
        },
      },
    })),
  };
}

function card(cardDatasId: number, charactersId: number, unitIds: readonly number[]) {
  return { cardDatasId, charactersId, unitIds };
}

function resetEffect(effectType: number, targetType: number, targetId: number) {
  return createLiveSpecialAppealResetEffect({
    id: '5501',
    actionType: 55,
    orderId: 1,
    details: [
      detail('1', 'RESET_SPECIAL_APPEAL_COUNT_EFFECT_TYPE', effectType),
      detail('2', 'RESET_SPECIAL_APPEAL_COUNT_TARGET_TYPE', targetType),
      detail('3', 'RESET_SPECIAL_APPEAL_COUNT_TARGET_ID', targetId),
    ],
  });
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, effectValue, targetMood: 0, params: [] };
}
