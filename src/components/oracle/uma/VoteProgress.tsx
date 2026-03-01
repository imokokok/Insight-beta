'use client';

import { memo } from 'react';

export interface VoteProgressProps {
  votesFor: string | number;
  votesAgainst: string | number;
  showLabels?: boolean;
}

export const VoteProgress = memo(function VoteProgress({
  votesFor,
  votesAgainst,
  showLabels = true,
}: VoteProgressProps) {
  const forVotes = Number(votesFor) || 0;
  const againstVotes = Number(votesAgainst) || 0;
  const total = forVotes + againstVotes;

  const forPercentage = total > 0 ? (forVotes / total) * 100 : 0;
  const againstPercentage = total > 0 ? (againstVotes / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${forPercentage}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${againstPercentage}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              {forPercentage.toFixed(1)}% ({forVotes.toLocaleString()})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {againstPercentage.toFixed(1)}% ({againstVotes.toLocaleString()})
            </span>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </div>
  );
});
