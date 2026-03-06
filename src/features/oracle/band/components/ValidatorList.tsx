'use client';

import { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Trophy, TrendingUp, Activity, Shield, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils';

export interface Validator {
  address: string;
  name: string;
  rank: number;
  votingPower: number;
  votingPowerPercent: number;
  commission: number;
  uptime: number;
  blocksSigned: number;
  blocksMissed: number;
  status: 'active' | 'inactive' | 'jailed';
  delegators: number;
  rewards24h: number;
  uptimeHistory: number[];
}

interface ValidatorListProps {
  validators?: Validator[];
  loading?: boolean;
  limit?: number;
}

export function ValidatorList({ validators, loading = false, limit = 20 }: ValidatorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'votingPower' | 'commission' | 'uptime'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedValidators, setExpandedValidators] = useState<Set<string>>(new Set());

  const mockValidators: Validator[] = useMemo(() => {
    if (validators && validators.length > 0) return validators;
    
    return Array.from({ length: 30 }, (_, i) => ({
      address: `bandvaloper1${Array.from({ length: 38 }, () => 
        'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`,
      name: `Validator ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i - 25 : ''}`,
      rank: i + 1,
      votingPower: Math.floor(Math.random() * 1000000) + 100000,
      votingPowerPercent: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
      commission: parseFloat((Math.random() * 10 + 1).toFixed(2)),
      uptime: parseFloat((Math.random() * 5 + 95).toFixed(2)),
      blocksSigned: Math.floor(Math.random() * 100000) + 50000,
      blocksMissed: Math.floor(Math.random() * 1000),
      status: i < 25 ? 'active' : i < 28 ? 'inactive' : 'jailed',
      delegators: Math.floor(Math.random() * 5000) + 100,
      rewards24h: parseFloat((Math.random() * 100 + 10).toFixed(2)),
      uptimeHistory: Array.from({ length: 7 }, () => 
        parseFloat((Math.random() * 5 + 95).toFixed(2))
      ),
    }));
  }, [validators]);

  const filteredAndSortedValidators = useMemo(() => {
    let filtered = [...mockValidators];

    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'votingPower':
          comparison = b.votingPower - a.votingPower;
          break;
        case 'commission':
          comparison = a.commission - b.commission;
          break;
        case 'uptime':
          comparison = b.uptime - a.uptime;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [mockValidators, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: 'rank' | 'votingPower' | 'commission' | 'uptime') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleExpanded = (address: string) => {
    const newExpanded = new Set(expandedValidators);
    if (newExpanded.has(address)) {
      newExpanded.delete(address);
    } else {
      newExpanded.add(address);
    }
    setExpandedValidators(newExpanded);
  };

  const isExpanded = (address: string) => expandedValidators.has(address);

  const getStatusColor = (status: Validator['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'jailed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-600 dark:text-green-400';
    if (uptime >= 97) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search validators by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'rank' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('rank')}
          >
            <Trophy className="mr-1 h-3 w-3" />
            Rank
          </Button>
          <Button
            variant={sortBy === 'votingPower' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('votingPower')}
          >
            <Shield className="mr-1 h-3 w-3" />
            Voting Power
          </Button>
          <Button
            variant={sortBy === 'uptime' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('uptime')}
          >
            <Activity className="mr-1 h-3 w-3" />
            Uptime
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 p-3 text-xs font-semibold">
          <div className="col-span-2 sm:col-span-1">Rank</div>
          <div className="col-span-4 sm:col-span-2">Validator</div>
          <div className="col-span-3 sm:col-span-2 text-right">Voting Power</div>
          <div className="hidden col-span-2 text-right sm:block">Commission</div>
          <div className="col-span-3 sm:col-span-2 text-right">Uptime</div>
          <div className="hidden col-span-2 text-right sm:block">Status</div>
        </div>

        <Virtuoso
          data={filteredAndSortedValidators}
          overscan={{ main: 200, reverse: 100 }}
          style={{ height: '600px' }}
          itemContent={(index, validator) => (
            <div key={validator.address}>
              <div
                className={cn(
                  'grid grid-cols-12 gap-4 p-3 transition-colors hover:bg-muted/50',
                  'cursor-pointer border-b',
                  isExpanded(validator.address) && 'bg-muted'
                )}
                onClick={() => toggleExpanded(validator.address)}
              >
                <div className="col-span-2 sm:col-span-1 flex items-center">
                  <span className="font-mono text-sm font-semibold">#{validator.rank}</span>
                </div>
                
                <div className="col-span-4 sm:col-span-2 flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{validator.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatAddress(validator.address)}
                    </span>
                  </div>
                </div>

                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold">
                      {validator.votingPower.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {validator.votingPowerPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="hidden col-span-2 sm:flex items-center justify-end">
                  <span className={cn(
                    'text-sm font-semibold',
                    validator.commission < 5 ? 'text-green-600' : 
                    validator.commission < 8 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {validator.commission.toFixed(2)}%
                  </span>
                </div>

                <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                  <div className="flex flex-col items-end">
                    <span className={cn('text-sm font-semibold', getUptimeColor(validator.uptime))}>
                      {validator.uptime.toFixed(2)}%
                    </span>
                    <div className="mt-1 flex gap-0.5">
                      {validator.uptimeHistory.map((uptime, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            uptime >= 99 ? 'bg-green-500' :
                            uptime >= 97 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          title={`Day ${i + 1}: ${uptime}%`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden col-span-2 sm:flex items-center justify-end">
                  <Badge className={getStatusColor(validator.status)}>
                    {validator.status}
                  </Badge>
                </div>
              </div>

              {isExpanded(validator.address) && (
                <div className="border-t bg-muted/30 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground">Blocks</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Signed:</span>
                          <span className="font-semibold">{validator.blocksSigned.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Missed:</span>
                          <span className="font-semibold">{validator.blocksMissed.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground">Delegations</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Delegators:</span>
                          <span className="font-semibold">{validator.delegators.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">24h Rewards:</span>
                          <span className="font-semibold">{validator.rewards24h.toFixed(2)} BAND</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground">Performance</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className={cn(
                          'text-sm font-semibold',
                          validator.uptime >= 99 ? 'text-green-600' : 'text-yellow-600'
                        )}>
                          {validator.uptime >= 99 ? 'Excellent' : 'Good'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        />
      </div>

      {filteredAndSortedValidators.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Activity className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-2">No validators found</p>
        </div>
      )}
    </div>
  );
}
