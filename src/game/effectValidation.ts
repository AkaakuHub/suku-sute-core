import { validateSkillCooldownEffect } from './skillCooldownTypes.ts';
import { validateTokenCardEffect } from './tokenRequestTypes.ts';
import { validateSpecialEffect } from './effectSpecialValidation.ts';
import { validateComboInduceEffect } from './comboInduceTypes.ts';
import { validateAdditionalHeartInduceEffect } from './additionalHeartTypes.ts';
import { validateInduceSkillEffect } from './induceSkillEffectTypes.ts';
import type { Effect } from './model.ts';
import { validateMoodChangeSkillEffect } from './moodChangeSkillTypes.ts';
import { validateBeatHeartValueBuff } from './beatHeartValueBuffTypes.ts';
import { validateBeatPointBuffEffect } from './beatPointBuffTypes.ts';
import { validateHeartLimitBoost } from './heartLimitBoostTypes.ts';
import { validateMoodValueBoost } from './moodValueBoostTypes.ts';
import { validateGenesisSkill } from './genesisSkillTypes.ts';
import { validateGaugeRegenerationEffect } from './gaugeRegenerationTypes.ts';
import { validateSkillCostChangeEffect } from './skillCostChangeTypes.ts';
import { validateAddVoltageSkillEffect } from './addVoltageTypes.ts';
import { validateHeartBoostEffect } from './heartBoostTypes.ts';
import { validateSkillHeartsEffect } from './skillHeartTypes.ts';
import { validateSkillScoreUpEffect } from './skillScoreUpTypes.ts';
import { isInt64 } from '../runtime/numeric.ts';
import { validateHandCardCountEffect } from './actionTypeEffects/handCardCount.ts';
import { validateApSpeedChangeEffect } from './actionTypeEffects/apSpeedChange.ts';
import { validateMentalBarrierEffect } from './mentalBarrierTypes.ts';
export function validateEffect(effect: Effect): void {
  if (effect.skillEffectId !== undefined && !isInt64(effect.skillEffectId))
    throw new Error('スキル効果IDが正しくありません。');
  if (effect.kind === 'add-voltage-skill') return validateAddVoltageSkillEffect(effect);
  if (effect.kind === 'search-unit' || effect.kind === 'search-token' || effect.kind === 'search') {
    if (!Number.isSafeInteger(effect.count) || effect.count < 1)
      throw new Error('検索回数が正しくありません。');
    if (
      effect.kind === 'search' &&
      effect.deactivationKey !== undefined &&
      typeof effect.deactivationKey !== 'string'
    )
      throw new Error('検索解除キーが正しくありません。');
    return;
  }
  if (effect.kind === 'mode' || effect.kind === 'mode-reaction') {
    const invalidModeId =
      effect.kind === 'mode'
        ? !isInt64(effect.modeId) || effect.modeId < 0n
        : !Number.isSafeInteger(effect.modeId) || effect.modeId < 1;
    if (invalidModeId) throw new Error('モードIDが正しくありません。');
    if (effect.kind === 'mode-reaction') {
      if (
        !isInt64(effect.buffNum) ||
        effect.thresholds.some((count) => !isInt64(count) || count < 1n)
      )
        throw new Error('モード切替の発動条件が正しくありません。');
      for (const child of effect.effects) validateEffect(child);
    }
    return;
  }
  if (effect.kind === 'branch') {
    if (
      (effect.persistent !== undefined && typeof effect.persistent !== 'boolean') ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('条件分岐の設定が正しくありません。');
    for (const child of [...effect.whenTrue, ...effect.whenFalse]) validateEffect(child);
    return;
  }
  if (effect.kind === 'conditional') {
    for (const child of effect.effects) validateEffect(child);
    return;
  }
  if (effect.kind === 'draw-success-induce') {
    if (
      effect.sourceEffectId.length === 0 ||
      typeof effect.branchType !== 'bigint' ||
      typeof effect.branchValue !== 'bigint' ||
      (effect.disabledType !== undefined && typeof effect.disabledType !== 'bigint')
    )
      throw new Error('ドロー成功時の分岐効果が正しくありません。');
    for (const child of [...effect.whenTrue, ...effect.whenFalse]) validateEffect(child);
    return;
  }
  if (effect.kind === 'voltage-tier') {
    if (effect.tiers.length !== 1000 / effect.step + 1)
      throw new Error('熱気の段階数が正しくありません。');
    for (const tier of effect.tiers) for (const child of tier) validateEffect(child);
    return;
  }
  if (
    effect.kind === 'collect' ||
    effect.kind === 'shuffle' ||
    effect.kind === 'protect-mental' ||
    effect.kind === 'card-move'
  )
    return;
  if (effect.kind === 'reset-special') {
    if (
      !['normal', 'extra', 'all'].includes(effect.scope) ||
      !['all', 'source', 'others', 'member', 'unit'].includes(effect.target.kind) ||
      (effect.target.kind === 'member' && !Number.isSafeInteger(effect.target.member)) ||
      (effect.target.kind === 'unit' && ![1, 2, 3].includes(effect.target.unit))
    )
      throw new Error('共鳴の再使用対象が正しくありません。');
    return;
  }
  if (effect.kind === 'use-hand') {
    if (effect.addAp !== undefined && !Number.isSafeInteger(effect.addAp))
      throw new Error('一斉使用の追加消費量が正しくありません。');
    return;
  }
  if (effect.kind === 'tokens') {
    if (!Number.isSafeInteger(effect.count) || effect.count < 1)
      throw new Error('追加カードの枚数が正しくありません。');
    return;
  }
  if (effect.kind === 'token-deck-split') {
    if (
      (effect.seriesIds !== null && effect.seriesIds.some((id) => !isInt64(id))) ||
      (effect.duration.kind === 'sections'
        ? effect.duration.value < 1n
        : !Number.isSafeInteger(effect.duration.value)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('トークンカードデッキ切替の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'ingame-mission' && !isInt64(effect.groupId))
    throw new Error('ミッションのグループIDが正しくありません。');
  if (effect.kind === 'ingame-mission') return;
  if (effect.kind === 'hand-limit') return validateHandCardCountEffect(effect);
  if (effect.kind === 'proxy-skill') {
    if (
      !Number.isSafeInteger(effect.absorbLimit) ||
      !isInt64(effect.periodParam) ||
      (effect.periodType !== 3 && effect.periodParam < 1n) ||
      (effect.periodType === 3 && effect.induceTiming !== 1) ||
      !Number.isFinite(effect.inducePowerParam) ||
      effect.targets.some(
        (target) =>
          !Number.isSafeInteger(target.actionType) || !Number.isSafeInteger(target.targetAmount),
      )
    )
      throw new Error('Proxyスキルの設定が正しくありません。');
    for (const child of effect.effects) validateEffect(child.effect);
    return;
  }
  if (effect.kind === 'infinity-gauge') {
    if (
      (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
      (effect.duration.kind !== 'sections' && !Number.isSafeInteger(effect.duration.value)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('無限ゲージの設定が正しくありません。');
    return;
  }
  if (effect.kind === 'token-card') return validateTokenCardEffect(effect);
  if (effect.kind === 'token-boost') {
    if (
      !isInt64(effect.num) ||
      (effect.uses !== undefined && (!isInt64(effect.uses) || effect.uses < 0n)) ||
      (effect.duration !== undefined &&
        (!isInt64(effect.duration.value) || effect.duration.value < 0n)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('追加カード増幅の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'stop-voltage-increase') {
    if (
      (effect.duration.kind === 'milliseconds' && !Number.isFinite(effect.duration.value)) ||
      (effect.duration.kind === 'sections' && !isInt64(effect.duration.value)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('熱気停止の期限が正しくありません。');
    return;
  }
  if (effect.kind === 'amplify' || effect.kind === 'resource-boost' || effect.kind === 'ap-speed') {
    if (!Number.isFinite(effect.percent)) throw new Error('増幅率が正しくありません。');
    if (
      effect.kind === 'resource-boost' &&
      effect.uses !== null &&
      (!Number.isSafeInteger(effect.uses) || effect.uses < 1)
    )
      throw new Error('増幅回数が正しくありません。');
    return;
  }
  if (effect.kind === 'ap-speed-change') return validateApSpeedChangeEffect(effect);
  if (effect.kind === 'voltage-convert') {
    const validDuration = (duration: typeof effect.displayDuration, allowZero: boolean) =>
      (duration.kind === 'stage' ||
        duration.kind === 'milliseconds' ||
        duration.kind === 'sections') &&
      Number.isSafeInteger(duration.value) &&
      duration.value >= (allowZero ? 0 : duration.kind === 'sections' ? 1 : 0);
    if (
      !['hearts', 'love', 'mental', 'mental-barrier'].includes(effect.destination) ||
      !Number.isSafeInteger(effect.num) ||
      ![0, 1, 2].includes(effect.convertDisabledType) ||
      ![0, 1].includes(effect.disabledType) ||
      !isInt64(effect.disabledValue) ||
      !validDuration(effect.displayDuration, false) ||
      !validDuration(effect.outputDuration, true) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('熱気変換の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'mental-heart-induce') {
    const validDuration = (duration: typeof effect.duration, allowStage: boolean) =>
      (duration.kind === 'milliseconds' ||
        duration.kind === 'sections' ||
        (allowStage && duration.kind === 'stage')) &&
      isInt64(duration.value) &&
      duration.value >= BigInt(duration.kind === 'sections' ? 1 : 0);
    const validHeartDuration =
      (effect.heartDuration.kind === 'milliseconds' || effect.heartDuration.kind === 'stage') &&
      Number.isSafeInteger(effect.heartDuration.value) &&
      effect.heartDuration.value >= 0;
    if (
      !isInt64(effect.num) ||
      ![0, 1].includes(effect.disabledType) ||
      !isInt64(effect.disabledValue) ||
      !validDuration(effect.duration, true) ||
      !validHeartDuration ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('精神力連動ハート生成の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'combo-induce') {
    return validateComboInduceEffect(effect, validateEffect);
  }
  if (effect.kind === 'additional-heart-induce') {
    validateAdditionalHeartInduceEffect(effect);
    validateEffect(effect.heartEffect);
    return;
  }
  if (effect.kind === 'heart-limit-change') {
    if (
      ![1, 2].includes(effect.calculationType) ||
      !isInt64(effect.num) ||
      ![0, 1, 2, 3].includes(effect.bonusMoodTarget) ||
      !isInt64(effect.bonusMoodValue) ||
      !['milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
      (effect.duration.kind !== 'stage' && !isInt64(effect.duration.value)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('きらめき上限変更の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'skill-boost') {
    const duration = effect.duration;
    if (
      !Number.isSafeInteger(effect.num) ||
      (effect.target.kind === 'member' && !Number.isSafeInteger(effect.target.member)) ||
      (effect.target.kind === 'unit' && ![1, 2, 3].includes(effect.target.unit)) ||
      (effect.target.kind === 'token-series' && !Number.isSafeInteger(effect.target.seriesId)) ||
      (effect.moodBonus !== undefined &&
        (!Number.isFinite(effect.moodBonus.perPoint) ||
          ![1, 2, 3].includes(effect.moodBonus.target))) ||
      !['stage', 'milliseconds', 'sections'].includes(duration.kind) ||
      !isInt64(duration.value) ||
      (effect.uses !== null && !isInt64(effect.uses)) ||
      effect.skillTokenSeriesIds?.some((seriesId) => !isInt64(seriesId)) ||
      (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
      (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
    )
      throw new Error('ActionType52の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'heart-boost') return validateHeartBoostEffect(effect);
  if (effect.kind === 'skill-hearts') return validateSkillHeartsEffect(effect);
  if (effect.kind === 'skill-score-up') return validateSkillScoreUpEffect(effect);
  if (effect.kind === 'beat-point-buff') return validateBeatPointBuffEffect(effect);
  if (effect.kind === 'beat-heart-value-buff') {
    validateBeatHeartValueBuff(effect);
    return;
  }
  if (effect.kind === 'gauge-regeneration') return validateGaugeRegenerationEffect(effect);
  if (effect.kind === 'mood-change-skill') {
    validateMoodChangeSkillEffect(effect);
    return;
  }
  if (effect.kind === 'heart-limit-boost') {
    validateHeartLimitBoost(effect);
    return;
  }
  if (effect.kind === 'mood-value-boost') return validateMoodValueBoost(effect);
  if (effect.kind === 'genesis-skill') return validateGenesisSkill(effect);
  if (validateSpecialEffect(effect, validateEffect)) return;
  if (effect.kind === 'skill-cost-change') return validateSkillCostChangeEffect(effect);
  if (effect.kind === 'parameter-value-change') {
    if (
      !effect.sourceEffectId ||
      effect.targetDetailId < 0n ||
      !Number.isSafeInteger(effect.base) ||
      !Number.isSafeInteger(effect.increment) ||
      (effect.values !== undefined &&
        effect.values.some((value) => !Number.isSafeInteger(value))) ||
      (effect.calculation === 'multiply' && !effect.values?.length) ||
      (effect.calculation === 'fan-level' &&
        (!effect.members?.length || effect.members.some((member) => member <= 0)))
    )
      throw new Error('詳細値変更の設定が正しくありません。');
    return;
  }
  if (effect.kind === 'skill-cooldown') return validateSkillCooldownEffect(effect);
  if (effect.kind === 'induce-skill-effect') {
    validateInduceSkillEffect(effect);
    for (const child of effect.effects) {
      if (!Number.isSafeInteger(child.actionType) || child.actionType < 0)
        throw new Error('誘発スキル効果のActionTypeが正しくありません。');
      validateEffect(child.effect);
    }
    return;
  }
  if (
    effect.kind === 'hearts' &&
    effect.lifetimeSeconds !== undefined &&
    !Number.isFinite(effect.lifetimeSeconds)
  )
    throw new Error('きらめき寿命が正しくありません。');
  if (effect.kind === 'genesis') {
    if (!Number.isFinite(effect.effectValue) || effect.effectValue < 0)
      throw new Error('開花の効果量が正しくありません。');
    return;
  }
  if (effect.kind === 'boost') {
    if (!Number.isFinite(effect.multiplier) || effect.multiplier < 1)
      throw new Error('得点倍率と効果時間が正しくありません。');
    return;
  }
  if (effect.kind === 'ap' && Number.isFinite(effect.amount)) return;
  if (effect.kind === 'mental-barrier') return validateMentalBarrierEffect(effect);
  if (
    !('amount' in effect) ||
    !Number.isSafeInteger(effect.amount) ||
    (effect.kind === 'recover-mental-skill' && !Number.isSafeInteger(effect.numberType))
  )
    throw new Error('カードの効果量が正しくありません。');
}
