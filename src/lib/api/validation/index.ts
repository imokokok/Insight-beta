import { validateSymbol as validateSymbolCore } from '@/lib/blockchain/security/inputValidation';

export { validateBody, parseAndValidate } from './validate';
export type { ValidationResult } from './validate';

export {
  notificationChannelTypeSchema,
  notificationChannelConfigSchema,
  createNotificationChannelSchema,
  updateNotificationChannelSchema,
  alertEventSchema,
  alertSeveritySchema,
  alertChannelSchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
} from './schemas';

export type {
  CreateNotificationChannelInput,
  UpdateNotificationChannelInput,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from './schemas';

export {
  ALERT_EVENTS,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  NOTIFICATION_CHANNEL_TYPES,
  ORACLE_PROTOCOLS,
  isAlertEvent,
  isAlertSeverity,
  isAlertStatus,
  isNotificationChannelType,
  isOracleProtocol,
  isSupportedChain,
  parseAlertEvent,
  parseAlertSeverity,
  parseAlertStatus,
  parseOracleProtocolArray,
  parseSupportedChainArray,
} from './typeGuards';

export function validateSymbol(symbol: string | null): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const result = validateSymbolCore(symbol);
  if (!result.valid) {
    return null;
  }
  return result.sanitized as string;
}
