import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

import type { Address } from 'viem';

interface VerifyRequestBody {
  signedData: {
    value: string;
    timestamp: string;
    signature: `0x${string}`;
    airnode: Address;
    templateId: `0x${string}`;
  };
  expectedValue?: string;
  maxAgeSeconds?: number;
}

interface VerifyResult {
  valid: boolean;
  checks: {
    valuePositive: boolean;
    timestampValid: boolean;
    notExpired: boolean;
    valueMatches: boolean;
    signatureFormat: boolean;
  };
  details: {
    value: string;
    timestamp: string;
    age: number;
    maxAge: number;
  };
  errors: string[];
}

function validateRequestBody(body: unknown): body is VerifyRequestBody {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;

  if (!obj.signedData || typeof obj.signedData !== 'object') return false;
  const signedData = obj.signedData as Record<string, unknown>;

  return (
    typeof signedData.value === 'string' &&
    typeof signedData.timestamp === 'string' &&
    typeof signedData.signature === 'string' &&
    typeof signedData.airnode === 'string' &&
    typeof signedData.templateId === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequestBody(body)) {
      return error(
        {
          code: 'INVALID_REQUEST',
          message:
            'Invalid request body. Required: signedData with value, timestamp, signature, airnode, templateId',
        },
        400,
      );
    }

    const { signedData, expectedValue, maxAgeSeconds = 3600 } = body;

    const errors: string[] = [];
    const checks = {
      valuePositive: false,
      timestampValid: false,
      notExpired: false,
      valueMatches: true,
      signatureFormat: false,
    };

    let value: bigint | undefined;
    try {
      value = BigInt(signedData.value);
      checks.valuePositive = value > 0n;
      if (!checks.valuePositive) {
        errors.push('Value must be positive');
      }
    } catch {
      errors.push('Invalid value format');
    }

    let timestamp: number | undefined;
    try {
      timestamp = parseInt(signedData.timestamp, 10);
      checks.timestampValid = !isNaN(timestamp) && timestamp > 0;
      if (!checks.timestampValid) {
        errors.push('Invalid timestamp format');
      }
    } catch {
      errors.push('Invalid timestamp format');
    }

    const now = Math.floor(Date.now() / 1000);
    const age = now - (timestamp ?? 0);
    checks.notExpired = age <= maxAgeSeconds;
    if (!checks.notExpired && checks.timestampValid) {
      errors.push(`Data is expired: ${age}s old (max: ${maxAgeSeconds}s)`);
    }

    if (expectedValue !== undefined && value !== undefined) {
      try {
        const expected = BigInt(expectedValue);
        checks.valueMatches = value === expected;
        if (!checks.valueMatches) {
          errors.push(`Value mismatch: expected ${expectedValue}, got ${signedData.value}`);
        }
      } catch {
        errors.push('Invalid expectedValue format');
        checks.valueMatches = false;
      }
    }

    checks.signatureFormat =
      /^0x[a-fA-F0-9]{130}$/.test(signedData.signature) ||
      /^0x[a-fA-F0-9]{64,}$/.test(signedData.signature);
    if (!checks.signatureFormat) {
      errors.push('Invalid signature format');
    }

    const valid =
      checks.valuePositive &&
      checks.timestampValid &&
      checks.notExpired &&
      checks.valueMatches &&
      checks.signatureFormat;

    const result: VerifyResult = {
      valid,
      checks,
      details: {
        value: signedData.value,
        timestamp: signedData.timestamp,
        age,
        maxAge: maxAgeSeconds,
      },
      errors,
    };

    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
