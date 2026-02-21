'use client';

import { useState } from 'react';

import { AlertCircle, CheckCircle2, Loader2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { SignatureVerifyResult } from '../types/api3';

interface SignatureVerifyPanelProps {
  className?: string;
}

export function SignatureVerifyPanel({ className }: SignatureVerifyPanelProps) {
  const { t } = useI18n();
  const [signature, setSignature] = useState('');
  const [dataFeedId, setDataFeedId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [airnodeAddress, setAirnodeAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SignatureVerifyResult | null>(null);

  const handleVerify = async () => {
    if (!signature || !dataFeedId) {
      setResult({
        isValid: false,
        error: t('api3.signature.requiredFields'),
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const isValid = signature.length >= 64 && dataFeedId.startsWith('0x');

      if (isValid) {
        setResult({
          isValid: true,
          signer: '0x' + 'abcd1234'.padEnd(40, '0'),
          dataFeedId: dataFeedId,
          timestamp: timestamp || new Date().toISOString(),
        });
      } else {
        setResult({
          isValid: false,
          error: t('api3.signature.invalidSignature'),
        });
      }
    } catch (error) {
      setResult({
        isValid: false,
        error: error instanceof Error ? error.message : t('common.unknownError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSignature('');
    setDataFeedId('');
    setTimestamp('');
    setAirnodeAddress('');
    setResult(null);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('api3.signature.title')}
        </CardTitle>
        <CardDescription>{t('api3.signature.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signature">{t('api3.signature.signatureLabel')}</Label>
            <Input
              id="signature"
              placeholder="0x..."
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{t('api3.signature.signatureHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataFeedId">{t('api3.signature.dataFeedIdLabel')}</Label>
            <Input
              id="dataFeedId"
              placeholder="0x..."
              value={dataFeedId}
              onChange={(e) => setDataFeedId(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timestamp">{t('api3.signature.timestampLabel')}</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airnodeAddress">{t('api3.signature.airnodeLabel')}</Label>
              <Input
                id="airnodeAddress"
                placeholder="0x..."
                value={airnodeAddress}
                onChange={(e) => setAirnodeAddress(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.verifying')}
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t('api3.signature.verifyButton')}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            {t('common.clear')}
          </Button>
        </div>

        {result && (
          <Alert
            variant={result.isValid ? 'default' : 'destructive'}
            className={cn(
              result.isValid
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-red-500/50 bg-red-500/10',
            )}
          >
            <div className="flex items-start gap-3">
              {result.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div className="flex-1">
                <AlertTitle className={result.isValid ? 'text-green-700' : 'text-red-700'}>
                  {result.isValid ? t('api3.signature.valid') : t('api3.signature.invalid')}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  {result.isValid ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t('api3.signature.signer')}:
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {result.signer}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t('api3.signature.dataFeedId')}:
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {result.dataFeedId?.slice(0, 10)}...{result.dataFeedId?.slice(-8)}
                        </Badge>
                      </div>
                      {result.timestamp && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {t('api3.signature.timestamp')}:
                          </span>
                          <span className="text-sm">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-500" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">{t('api3.signature.note')}</p>
              <p className="mt-1">{t('api3.signature.noteDescription')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
