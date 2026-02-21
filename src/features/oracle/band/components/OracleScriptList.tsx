'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  FileCode,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { formatTime } from '@/shared/utils';

import type { OracleScript } from '../types';

interface OracleScriptListProps {
  scripts?: OracleScript[];
  loading?: boolean;
  className?: string;
}

const mockOracleScripts: OracleScript[] = [
  {
    scriptId: '1',
    name: 'Crypto Price',
    description: 'Fetches cryptocurrency prices from multiple exchanges',
    owner: 'band1abc123...',
    codeHash: '0x1234...abcd',
    schema: '{symbol:string,price:uint64}',
    status: 'active',
    totalRequests: 125430,
    lastRequestAt: new Date(Date.now() - 300000).toISOString(),
    avgResponseTimeMs: 450,
    successRate: 99.8,
  },
  {
    scriptId: '2',
    name: 'Stock Price',
    description: 'Retrieves stock market data from financial APIs',
    owner: 'band1def456...',
    codeHash: '0x5678...efgh',
    schema: '{ticker:string,price:uint64}',
    status: 'active',
    totalRequests: 89210,
    lastRequestAt: new Date(Date.now() - 600000).toISOString(),
    avgResponseTimeMs: 520,
    successRate: 99.5,
  },
  {
    scriptId: '3',
    name: 'Weather Data',
    description: 'Gets weather information from various weather APIs',
    owner: 'band1ghi789...',
    codeHash: '0x90ab...ijkl',
    schema: '{location:string,temp:uint64}',
    status: 'inactive',
    totalRequests: 15670,
    lastRequestAt: new Date(Date.now() - 86400000).toISOString(),
    avgResponseTimeMs: 680,
    successRate: 98.2,
  },
  {
    scriptId: '4',
    name: 'Sports Score',
    description: 'Fetches live sports scores and statistics',
    owner: 'band1jkl012...',
    codeHash: '0xcdef...mnop',
    schema: '{gameId:string,score:string}',
    status: 'deprecated',
    totalRequests: 5430,
    lastRequestAt: new Date(Date.now() - 259200000).toISOString(),
    avgResponseTimeMs: 750,
    successRate: 95.1,
  },
];

export function OracleScriptList({
  scripts: externalScripts,
  loading: externalLoading,
  className,
}: OracleScriptListProps) {
  const [internalScripts, setInternalScripts] = useState<OracleScript[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const useExternalData = externalScripts !== undefined;

  const fetchScripts = useCallback(async () => {
    if (useExternalData) return;
    setInternalLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setInternalScripts(mockOracleScripts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setInternalScripts([]);
    } finally {
      setInternalLoading(false);
    }
  }, [useExternalData]);

  useEffect(() => {
    if (!useExternalData) {
      fetchScripts();
    }
  }, [fetchScripts, useExternalData]);

  const scripts = useExternalData ? externalScripts : internalScripts;
  const isLoading = useExternalData ? (externalLoading ?? false) : internalLoading;

  const formatRequestCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const toggleRow = (scriptId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(scriptId)) {
        next.delete(scriptId);
      } else {
        next.add(scriptId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Oracle Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Oracle Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchScripts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scripts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Oracle Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FileCode className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No Oracle Scripts found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Oracle Scripts
            </CardTitle>
            <CardDescription>Showing {scripts.length} Oracle Scripts</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchScripts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3" />
                    Requests
                  </div>
                </TableHead>
                <TableHead className="text-center">Avg Response</TableHead>
                <TableHead className="text-center">Success Rate</TableHead>
                <TableHead>Last Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.map((script) => {
                const isExpanded = expandedRows.has(script.scriptId);
                return (
                  <>
                    <TableRow
                      key={script.scriptId}
                      className="group cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(script.scriptId)}
                    >
                      <TableCell className="w-8">
                        <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{script.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {script.description}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            script.status === 'active'
                              ? 'active'
                              : script.status === 'inactive'
                                ? 'warning'
                                : 'offline'
                          }
                          text={script.status}
                          size="sm"
                          pulse={script.status === 'active'}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {formatRequestCount(script.totalRequests)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">{script.avgResponseTimeMs}ms</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            script.successRate >= 99
                              ? 'success'
                              : script.successRate >= 95
                                ? 'warning'
                                : 'danger'
                          }
                          size="sm"
                        >
                          {script.successRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(script.lastRequestAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${script.scriptId}-details`} className="bg-muted/30">
                        <TableCell colSpan={8} className="p-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-xs text-muted-foreground">Script ID</p>
                              <p className="font-mono text-sm">{script.scriptId}</p>
                            </div>
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-xs text-muted-foreground">Owner</p>
                              <p className="truncate font-mono text-sm">{script.owner}</p>
                            </div>
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-xs text-muted-foreground">Code Hash</p>
                              <p className="truncate font-mono text-sm">{script.codeHash}</p>
                            </div>
                            <div className="rounded-lg bg-background p-3">
                              <p className="text-xs text-muted-foreground">Schema</p>
                              <p className="truncate font-mono text-sm">{script.schema}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
