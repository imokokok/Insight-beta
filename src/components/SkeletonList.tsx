import { cn } from "@/lib/utils";

interface SkeletonListProps {
  count?: number;
  viewMode?: "grid" | "list";
}

export function SkeletonList({ count = 6, viewMode = "grid" }: SkeletonListProps) {
  return (
    <div className={cn(
      "grid gap-6",
      viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "glass-card rounded-2xl p-5 border border-white/60 animate-pulse",
            viewMode === "grid" ? "h-[220px]" : "h-[120px]"
          )}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gray-200/50" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200/50 rounded" />
              <div className="h-4 w-32 bg-gray-200/50 rounded" />
            </div>
            <div className="ml-auto h-6 w-20 bg-gray-200/50 rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
               <div className="h-3 w-24 bg-gray-200/50 rounded" />
               <div className="h-3 w-16 bg-gray-200/50 rounded" />
            </div>
            <div className="flex justify-between">
               <div className="h-3 w-24 bg-gray-200/50 rounded" />
               <div className="h-3 w-16 bg-gray-200/50 rounded" />
            </div>
            <div className="h-3 w-full bg-gray-200/50 rounded mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
