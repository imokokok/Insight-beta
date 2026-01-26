import { cn } from '@/lib/utils';

interface SkeletonListProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

export function SkeletonList({ count = 6, viewMode = 'grid' }: SkeletonListProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1',
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'glass-card animate-pulse rounded-2xl border border-white/60 p-5',
            viewMode === 'grid' ? 'h-[220px]' : 'h-[120px]',
          )}
        >
          <div className="mb-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gray-200/50" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200/50" />
              <div className="h-4 w-32 rounded bg-gray-200/50" />
            </div>
            <div className="ml-auto h-6 w-20 rounded-full bg-gray-200/50" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-gray-200/50" />
              <div className="h-3 w-16 rounded bg-gray-200/50" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-gray-200/50" />
              <div className="h-3 w-16 rounded bg-gray-200/50" />
            </div>
            <div className="mt-4 h-3 w-full rounded bg-gray-200/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
