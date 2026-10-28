import {
  createLiveCardSearchState,
  registerLiveCardSearchParam,
  removeLiveCardSearchParam,
  resetLiveCardSearchParams,
} from '../../src/runtime/cards/cardSearchState.ts';
import { prepareLiveDeckDraw } from '../../src/runtime/cards/deckDraw.ts';
import { describe, expect, test } from 'vite-plus/test';
import {
  addLiveDeckBoardCard,
  createLiveDeckBoardState,
  createLiveDeckBoardCard,
  moveLiveDeckCardToHand,
  moveLiveHandCardsToBoardState,
  moveLiveHandCardToExtra,
  moveLiveHandCardToGraveyard,
  liveBoardState,
  liveDeckBoardCardInstanceIds,
  reloadLiveDeckCards,
  updateLiveCardSkillUseAtBoardState,
  setLiveCardSkillUseAtBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';

describe('Live deck board state', () => {
  test('moves a used hand card to graveyard and draws only from deck', () => {
    const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001]);
    const used = moveLiveHandCardToGraveyard(initial, 1001);
    expect(liveDeckBoardCardInstanceIds(used, liveBoardState.graveyard)).toEqual([1001]);
    const drawn = moveLiveDeckCardToHand(used, 1002);
    expect(liveDeckBoardCardInstanceIds(drawn, liveBoardState.hand)).toEqual([1002]);
  });

  test('skill使用cardをExtra経由でProxyへ移し、終了時にGraveyardへ移す', () => {
    const initial = createLiveDeckBoardState([1001, 1002], [1001]);
    const extra = moveLiveHandCardToExtra(initial, 1001);
    expect(extra.cards).toMatchObject([
      {
        cardInstanceId: 1001,
        cardDatasId: 1001,
        boardState: liveBoardState.extra,
        skillUseAtBoardState: liveBoardState.graveyard,
      },
      {
        cardInstanceId: 1002,
        cardDatasId: 1002,
        boardState: liveBoardState.deck,
        skillUseAtBoardState: liveBoardState.graveyard,
      },
    ]);
    const proxy = updateLiveCardSkillUseAtBoardState(
      setLiveCardSkillUseAtBoardState(extra, 1001, liveBoardState.proxy),
      1001,
    );
    expect(proxy.cards[0]).toMatchObject({
      cardInstanceId: 1001,
      cardDatasId: 1001,
      boardState: liveBoardState.proxy,
      skillUseAtBoardState: liveBoardState.graveyard,
    });
    const graveyard = updateLiveCardSkillUseAtBoardState(proxy, 1001);
    expect(graveyard.cards[0]).toMatchObject({
      cardInstanceId: 1001,
      cardDatasId: 1001,
      boardState: liveBoardState.graveyard,
      skillUseAtBoardState: liveBoardState.graveyard,
    });
  });

  test('Proxy指定はExtraとExtra2以外のcardを移動しない', () => {
    const initial = createLiveDeckBoardState([1001], [1001]);
    const pending = setLiveCardSkillUseAtBoardState(initial, 1001, liveBoardState.proxy);
    const updated = updateLiveCardSkillUseAtBoardState(pending, 1001);
    expect(updated.cards[0]?.boardState).toBe(liveBoardState.hand);
    expect(updated.cards[0]?.skillUseAtBoardState).toBe(liveBoardState.graveyard);
  });

  test('reloads every graveyard card when the deck is empty', () => {
    const initial = createLiveDeckBoardState([1001, 1002], [1001, 1002]);
    const usedFirst = moveLiveHandCardToGraveyard(initial, 1001);
    const usedSecond = moveLiveHandCardToGraveyard(usedFirst, 1002);
    const reloaded = prepareLiveDeckDraw(usedSecond, [1001, 1002], () => 10_000);
    expect(reloaded.deckOutCount).toBe(1);
    expect(liveDeckBoardCardInstanceIds(reloaded, liveBoardState.deck)).toEqual([1001, 1002]);
  });

  test('ActionType13 recoveryは残存deckがあっても先に墓地を戻す', () => {
    const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002]);
    const used = moveLiveHandCardToGraveyard(initial, 1001);
    const reloaded = reloadLiveDeckCards(used);

    expect(reloaded.deckOutCount).toBe(0);
    expect(liveDeckBoardCardInstanceIds(reloaded, liveBoardState.deck)).toEqual([1001, 1003]);
  });

  test('moves every hand card to the ActionType13 stash board state', () => {
    const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002]);
    const stashed = moveLiveHandCardsToBoardState(initial, [1001, 1002], liveBoardState.deck);

    expect(liveDeckBoardCardInstanceIds(stashed, liveBoardState.hand)).toEqual([]);
    expect(liveDeckBoardCardInstanceIds(stashed, liveBoardState.deck)).toEqual([1001, 1002, 1003]);
  });

  test('同一CardDatasIdのtoken cardを別instanceとして個別に移動する', () => {
    const initial = createLiveDeckBoardState([1001], []);
    const first = addLiveDeckBoardCard(initial, 2001);
    const second = addLiveDeckBoardCard(first.state, 2001);
    const drawn = moveLiveDeckCardToHand(second.state, first.cardInstanceId);

    expect(first.cardInstanceId).not.toBe(second.cardInstanceId);
    expect(drawn.cards.find((card) => card.cardInstanceId === first.cardInstanceId)).toMatchObject({
      cardInstanceId: first.cardInstanceId,
      cardDatasId: 2001,
      boardState: liveBoardState.hand,
      skillUseAtBoardState: liveBoardState.graveyard,
    });
    expect(drawn.cards.find((card) => card.cardInstanceId === second.cardInstanceId)).toMatchObject(
      {
        cardInstanceId: second.cardInstanceId,
        cardDatasId: 2001,
        boardState: liveBoardState.deck,
        skillUseAtBoardState: liveBoardState.graveyard,
      },
    );
  });

  test('rejects a transition from a different official board state', () => {
    const initial = createLiveDeckBoardState([1001], []);
    expect(() => moveLiveHandCardToGraveyard(initial, 1001)).toThrow(
      'Live card board state transition is invalid',
    );
  });

  test('keeps duplicate skill card search params and removes one registration at a time', () => {
    const initial = createLiveDeckBoardState([1001], [1001]);
    const param = { searchType: 'character-id' as const, searchId: 1021 };
    const registered = registerLiveCardSearchParam(
      registerLiveCardSearchParam(initial, 'skill', param),
      'skill',
      param,
    );

    expect(registered.skillCardSearchParams).toEqual([param, param]);
    const removed = removeLiveCardSearchParam(registered, 'skill', param);
    expect(removed.skillCardSearchParams).toEqual([param]);
    expect(resetLiveCardSearchParams(removed).skillCardSearchParams).toEqual([]);
  });
});

test('保存した行き先はUpdateまで盤面に反映せず、適用後にgraveyardへ戻す', () => {
  const initial = moveLiveHandCardToExtra(createLiveDeckBoardState([1001, 1002], [1001]), 1001);
  const pending = setLiveCardSkillUseAtBoardState(initial, 1001, liveBoardState.exclusion);
  expect(pending.cards[0]?.boardState).toBe(liveBoardState.extra);
  expect(liveDeckBoardCardInstanceIds(pending, liveBoardState.exclusion)).toEqual([]);
  const completed = updateLiveCardSkillUseAtBoardState(pending, 1001);
  expect(completed.cards[0]?.boardState).toBe(liveBoardState.exclusion);
  expect(completed.cards[0]?.skillUseAtBoardState).toBe(liveBoardState.graveyard);
});

test.each([
  {
    previous: liveBoardState.deck,
    requested: liveBoardState.graveyard,
    expected: liveBoardState.deck,
  },
  {
    previous: liveBoardState.exclusion,
    requested: liveBoardState.deck,
    expected: liveBoardState.exclusion,
  },
  {
    previous: liveBoardState.proxy,
    requested: liveBoardState.exclusion,
    expected: liveBoardState.proxy,
  },
  {
    previous: liveBoardState.exclusion,
    requested: liveBoardState.proxy,
    expected: liveBoardState.proxy,
  },
  {
    previous: liveBoardState.deck,
    requested: liveBoardState.exclusion,
    expected: liveBoardState.exclusion,
  },
])('使用後の行き先の優先順位を維持する:%j', ({ previous, requested, expected }) => {
  const initial = createLiveDeckBoardState([1001], [1001]);
  const first = setLiveCardSkillUseAtBoardState(initial, 1001, previous);
  const next = setLiveCardSkillUseAtBoardState(first, 1001, requested);
  expect(next.cards[0]?.boardState).toBe(liveBoardState.hand);
  expect(next.cards[0]?.skillUseAtBoardState).toBe(expected);
});

test('文字列IDの盤面も使用中からProxyへの移動と保存先リセットを同じ状態で行う', () => {
  const state: import('../../src/runtime/cards/deckBoardState.ts').LiveDeckBoardState<string> = {
    cards: [
      {
        ...createLiveDeckBoardCard('source', 'blueprint', 5),
        skillUseAtBoardState: 7,
      },
    ],
    nextCardInstanceId: 1,
    deckOutCount: 0,
    ...createLiveCardSearchState<string>(),
  };
  const updated = updateLiveCardSkillUseAtBoardState(state, 'source');
  expect(updated.cards).toMatchObject([
    { cardInstanceId: 'source', cardDatasId: 'blueprint', boardState: 7, skillUseAtBoardState: 3 },
  ]);
});

test('墓地回収は蓄積済みのDeckOutCountを保持する', () => {
  const used = moveLiveHandCardToGraveyard(createLiveDeckBoardState([1001], [1001]), 1001);
  const reloaded = reloadLiveDeckCards({ ...used, deckOutCount: 3 });
  expect(reloaded.deckOutCount).toBe(3);
  expect(liveDeckBoardCardInstanceIds(reloaded, liveBoardState.deck)).toEqual([1001]);
});

test('候補も墓地もないドローはDeckOutCountを増やさない', () => {
  const initial = createLiveDeckBoardState([1001], [1001]);
  expect(prepareLiveDeckDraw(initial, [1001], () => 10_000).deckOutCount).toBe(0);
});
