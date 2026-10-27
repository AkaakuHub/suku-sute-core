import { describe, expect, test } from 'vite-plus/test';
import {
  addLiveDeckBoardCard,
  createLiveDeckBoardState,
  moveLiveDeckCardToHand,
  moveLiveHandCardsToBoardState,
  moveLiveHandCardToExtra,
  moveLiveHandCardToGraveyard,
  prepareLiveDeckDraw,
  liveBoardState,
  liveDeckBoardCardInstanceIds,
  registerLiveSkillCardSearchParam,
  reloadLiveDeckCards,
  removeLiveSkillCardSearchParam,
  resetLiveCardSearchParams,
  updateLiveCardSkillUseAtBoardState,
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
    expect(extra.cards).toEqual([
      {
        cardInstanceId: 1001,
        cardDatasId: 1001,
        boardState: liveBoardState.extra,
      },
      {
        cardInstanceId: 1002,
        cardDatasId: 1002,
        boardState: liveBoardState.deck,
      },
    ]);
    const proxy = updateLiveCardSkillUseAtBoardState(extra, 1001, liveBoardState.proxy);
    expect(proxy.cards[0]).toEqual({
      cardInstanceId: 1001,
      cardDatasId: 1001,
      boardState: liveBoardState.proxy,
    });
    const graveyard = updateLiveCardSkillUseAtBoardState(proxy, 1001, liveBoardState.graveyard);
    expect(graveyard.cards[0]).toEqual({
      cardInstanceId: 1001,
      cardDatasId: 1001,
      boardState: liveBoardState.graveyard,
    });
  });

  test('Proxy指定はExtraとExtra2以外のcardを移動しない', () => {
    const initial = createLiveDeckBoardState([1001], [1001]);
    expect(updateLiveCardSkillUseAtBoardState(initial, 1001, liveBoardState.proxy)).toBe(initial);
  });

  test('reloads every graveyard card when the deck is empty', () => {
    const initial = createLiveDeckBoardState([1001, 1002], [1001, 1002]);
    const usedFirst = moveLiveHandCardToGraveyard(initial, 1001);
    const usedSecond = moveLiveHandCardToGraveyard(usedFirst, 1002);
    const reloaded = prepareLiveDeckDraw(usedSecond);
    expect(reloaded.deckOutCount).toBe(1);
    expect(liveDeckBoardCardInstanceIds(reloaded, liveBoardState.deck)).toEqual([1001, 1002]);
  });

  test('ActionType13 recoveryは残存deckがあっても先に墓地を戻す', () => {
    const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002]);
    const used = moveLiveHandCardToGraveyard(initial, 1001);
    const reloaded = reloadLiveDeckCards(used);

    expect(reloaded.deckOutCount).toBe(1);
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
    expect(drawn.cards).toContainEqual({
      cardInstanceId: first.cardInstanceId,
      cardDatasId: 2001,
      boardState: liveBoardState.hand,
    });
    expect(drawn.cards).toContainEqual({
      cardInstanceId: second.cardInstanceId,
      cardDatasId: 2001,
      boardState: liveBoardState.deck,
    });
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
    const registered = registerLiveSkillCardSearchParam(
      registerLiveSkillCardSearchParam(initial, param),
      param,
    );

    expect(registered.skillCardSearchParams).toEqual([param, param]);
    const removed = removeLiveSkillCardSearchParam(registered, param);
    expect(removed.skillCardSearchParams).toEqual([param]);
    expect(resetLiveCardSearchParams(removed).skillCardSearchParams).toEqual([]);
  });
});
