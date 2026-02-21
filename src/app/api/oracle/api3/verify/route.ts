import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { API3Client, type API3SignedData } from '@/lib/blockchain/api3Oracle';

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
  chain?: string;
  rpcUrl?: string;
}

interface VerifyResult {
  valid: boolean;
  signer?: Address;
  checks: {
    valuePositive: boolean;
    timestampValid: boolean;
    notExpired: boolean;
    signatureValid: boolean;
    signerAuthorized: boolean;
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

    const { signedData, expectedValue, maxAgeSeconds = 3600, chain = 'ethereum', rpcUrl } = body;

    const api3SignedData: API3SignedData = {
      value: BigInt(signedData.value),
      timestamp: BigInt(signedData.timestamp),
      signature: signedData.signature,
      airnode: signedData.airnode,
      templateId: signedData.templateId,
    };

    const defaultRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
    const client = new API3Client(chain as 'ethereum', rpcUrl || defaultRpcUrl);

    const verificationResult = await client.verifySignedDataDetailed(api3SignedData, {
      maxAgeSeconds,
      expectedValue: expectedValue ? BigInt(expectedValue) : undefined,
    });

    const now = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(signedData.timestamp, 10);
    const age = now - timestamp;

    const result: VerifyResult = {
      valid: verificationResult.isValid,
      signer: verificationResult.signer,
      checks: verificationResult.checks,
      details: {
        value: signedData.value,
        timestamp: signedData.timestamp,
        age,
        maxAge: maxAgeSeconds,
      },
      errors: verificationResult.errors,
    };

    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
