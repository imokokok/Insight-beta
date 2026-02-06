import type { TranslationKey } from '@/i18n/translations';
import type { AlertRule } from '@/lib/types/oracleTypes';

export type Channel = 'webhook' | 'email' | 'telegram';

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  const atIndex = v.indexOf('@');
  if (atIndex <= 0 || atIndex >= v.length - 1) return false;
  const localPart = v.slice(0, atIndex);
  const domainPart = v.slice(atIndex + 1);
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (domainPart.length === 0 || domainPart.length > 253) return false;
  if (localPart.includes(' ') || domainPart.includes(' ')) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) return false;
  const domainParts = domainPart.split('.');
  if (domainParts.length < 2) return false;
  return domainParts.every(
    (part) => part.length > 0 && part.length <= 63 && /^[a-zA-Z0-9-]+$/.test(part),
  );
}

function getNumberParam(params: Record<string, unknown>, key: string): number {
  return Number(params[key]);
}

export const validationRules: Record<
  AlertRule['event'],
  (rule: AlertRule, t: (key: TranslationKey) => string) => string | null
> = {
  backlog_assertions: (rule, t) => {
    const maxOpenAssertions = getNumberParam(rule.params ?? {}, 'maxOpenAssertions');
    if (!Number.isFinite(maxOpenAssertions) || maxOpenAssertions <= 0) {
      return t('oracle.alerts.validation.maxOpenAssertionsPositive');
    }
    return null;
  },

  backlog_disputes: (rule, t) => {
    const maxOpenDisputes = getNumberParam(rule.params ?? {}, 'maxOpenDisputes');
    if (!Number.isFinite(maxOpenDisputes) || maxOpenDisputes <= 0) {
      return t('oracle.alerts.validation.maxOpenDisputesPositive');
    }
    return null;
  },

  contract_paused: () => null,

  database_slow_query: (rule, t) => {
    const thresholdMs = getNumberParam(rule.params ?? {}, 'thresholdMs');
    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
      return t('oracle.alerts.validation.databaseSlowQueryThresholdMsPositive');
    }
    return null;
  },

  dispute_created: () => null,

  execution_delayed: (rule, t) => {
    const maxDelayMinutes = getNumberParam(rule.params ?? {}, 'maxDelayMinutes');
    if (!Number.isFinite(maxDelayMinutes) || maxDelayMinutes <= 0) {
      return t('oracle.alerts.validation.executionDelayedMaxDelayMinutesPositive');
    }
    return null;
  },

  high_dispute_rate: (rule, t) => {
    const windowDays = getNumberParam(rule.params ?? {}, 'windowDays');
    const minAssertions = getNumberParam(rule.params ?? {}, 'minAssertions');
    const thresholdPercent = getNumberParam(rule.params ?? {}, 'thresholdPercent');
    if (!Number.isFinite(windowDays) || windowDays <= 0) {
      return t('oracle.alerts.validation.highDisputeRateWindowDaysPositive');
    }
    if (!Number.isFinite(minAssertions) || minAssertions <= 0) {
      return t('oracle.alerts.validation.highDisputeRateMinAssertionsPositive');
    }
    if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100) {
      return t('oracle.alerts.validation.highDisputeRateThresholdPercentRange');
    }
    return null;
  },

  high_error_rate: (rule, t) => {
    const thresholdPercent = getNumberParam(rule.params ?? {}, 'thresholdPercent');
    const windowMinutes = getNumberParam(rule.params ?? {}, 'windowMinutes');
    if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100) {
      return t('oracle.alerts.validation.highErrorRateThresholdPercentRange');
    }
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
      return t('oracle.alerts.validation.highErrorRateWindowMinutesPositive');
    }
    return null;
  },

  high_vote_divergence: (rule, t) => {
    const withinMinutes = getNumberParam(rule.params ?? {}, 'withinMinutes');
    const minTotalVotes = getNumberParam(rule.params ?? {}, 'minTotalVotes');
    const maxMarginPercent = getNumberParam(rule.params ?? {}, 'maxMarginPercent');
    if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
      return t('oracle.alerts.validation.withinMinutesPositive');
    }
    if (!Number.isFinite(minTotalVotes) || minTotalVotes <= 0) {
      return t('oracle.alerts.validation.minTotalVotesPositive');
    }
    if (!Number.isFinite(maxMarginPercent) || maxMarginPercent <= 0 || maxMarginPercent > 100) {
      return t('oracle.alerts.validation.maxMarginPercentRange');
    }
    return null;
  },

  liveness_expiring: (rule, t) => {
    const withinMinutes = getNumberParam(rule.params ?? {}, 'withinMinutes');
    if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
      return t('oracle.alerts.validation.withinMinutesPositive');
    }
    return null;
  },

  low_gas: (rule, t) => {
    const minBalanceEth = getNumberParam(rule.params ?? {}, 'minBalanceEth');
    if (!Number.isFinite(minBalanceEth) || minBalanceEth <= 0) {
      return t('oracle.alerts.validation.lowGasPositive');
    }
    return null;
  },

  low_participation: (rule, t) => {
    const withinMinutes = getNumberParam(rule.params ?? {}, 'withinMinutes');
    const minTotalVotes = getNumberParam(rule.params ?? {}, 'minTotalVotes');
    if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
      return t('oracle.alerts.validation.withinMinutesPositive');
    }
    if (!Number.isFinite(minTotalVotes) || minTotalVotes < 0) {
      return t('oracle.alerts.validation.minTotalVotesNonNegative');
    }
    return null;
  },

  market_stale: (rule, t) => {
    const maxAgeMs = getNumberParam(rule.params ?? {}, 'maxAgeMs');
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      return t('oracle.alerts.validation.marketStaleMaxAgeMsPositive');
    }
    return null;
  },

  price_deviation: (rule, t) => {
    const thresholdPercent = getNumberParam(rule.params ?? {}, 'thresholdPercent');
    if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0) {
      return t('oracle.alerts.validation.priceDeviationPositive');
    }
    return null;
  },

  slow_api_request: (rule, t) => {
    const thresholdMs = getNumberParam(rule.params ?? {}, 'thresholdMs');
    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
      return t('oracle.alerts.validation.slowApiThresholdMsPositive');
    }
    return null;
  },

  stale_sync: (rule, t) => {
    const maxAgeMs = getNumberParam(rule.params ?? {}, 'maxAgeMs');
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      return t('oracle.alerts.validation.staleSyncMaxAgeMsPositive');
    }
    return null;
  },
  sync_backlog: (rule, t) => {
    const maxLagBlocks = getNumberParam(rule.params ?? {}, 'maxLagBlocks');
    if (!Number.isFinite(maxLagBlocks) || maxLagBlocks <= 0) {
      return t('oracle.alerts.validation.maxLagBlocksPositive');
    }
    return null;
  },
  sync_error: () => null,
};

export function validateAlertRule(
  rule: AlertRule,
  channels: Channel[],
  t: (key: TranslationKey) => string,
): string | null {
  if (!rule.enabled) {
    return null;
  }

  if (channels.includes('email')) {
    const recipient = (rule.recipient ?? '').trim();
    if (!recipient) {
      return t('oracle.alerts.validation.emailRecipientRequired');
    }
    if (!isValidEmail(recipient)) {
      return t('oracle.alerts.validation.emailRecipientInvalid');
    }
  }

  const validator = validationRules[rule.event];
  if (validator) {
    return validator(rule, t);
  }

  return null;
}

export function normalizeChannels(channels: AlertRule['channels'] | undefined): Channel[] {
  const input = channels && channels.length > 0 ? channels : ['webhook'];
  const out: Channel[] = [];
  for (const c of input) {
    if (c !== 'webhook' && c !== 'email' && c !== 'telegram') continue;
    if (!out.includes(c)) out.push(c);
  }
  return out.length > 0 ? out : ['webhook'];
}
