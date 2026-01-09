import { ArrowLeft } from "lucide-react";

export function AssertionDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-3 py-2 w-24 h-9 bg-gray-200/50 rounded-lg" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between glass-panel p-6 rounded-3xl border border-white/60">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-48 bg-gray-200/50 rounded-lg" />
              <div className="h-7 w-24 bg-gray-200/50 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-32 bg-gray-200/50 rounded-md" />
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <div className="h-5 w-24 bg-gray-200/50 rounded" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end gap-1">
                <div className="h-4 w-20 bg-gray-200/50 rounded" />
                <div className="h-8 w-32 bg-gray-200/50 rounded" />
             </div>
             <div className="h-10 w-10 rounded-full bg-gray-200/50" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8 border border-white/60">
            <div className="mb-6 h-7 w-40 bg-gray-200/50 rounded" />
            
            <div className="mb-8 rounded-2xl bg-gray-50/50 p-6 h-32 w-full" />

            <div className="space-y-3">
              <div className="h-4 w-32 bg-gray-200/50 rounded" />
              <div className="rounded-xl bg-gray-50/50 p-5 h-16 w-full" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/60">
            <div className="h-6 w-32 bg-gray-200/50 rounded mb-6" />
            <div className="space-y-8 pl-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200/50 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-gray-200/50 rounded" />
                    <div className="h-3 w-32 bg-gray-200/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
