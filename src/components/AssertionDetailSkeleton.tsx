export function AssertionDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-3 py-2 w-24 h-9 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between glass-panel p-6 rounded-3xl border border-white/60">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
              <div className="h-7 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md" />
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <div className="h-5 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <div className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
              <div className="h-8 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-8 border border-white/60 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="200"
                height="200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <div className="h-8 w-52 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
              <div className="h-5 w-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-md" />
            </div>

            <div className="mb-8 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-6 h-32 w-full" />

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                  <div className="h-3 w-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                </div>
                <div className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 p-5 h-16 w-full" />
              </div>

              {/* Additional info sections */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-4"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="glass-card rounded-3xl p-8 border border-white/60">
            <div className="h-7 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-6" />
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 shrink-0" />
                  <div className="space-y-3 flex-1">
                    <div className="h-5 w-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                    <div className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                    <div className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/60 sticky top-24">
            <div className="h-6 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-6" />

            {/* Actions */}
            <div className="space-y-3">
              <div className="h-12 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
              <div className="h-12 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
            </div>

            {/* Dispute info */}
            <div className="mt-8 space-y-4">
              <div className="h-5 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
              <div className="h-20 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                  <div className="h-4 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded" />
                </div>
                <div className="h-3 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-gray-200 to-gray-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Payout Simulator */}
          <div className="glass-card rounded-3xl p-6 border border-white/60">
            <div className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-4" />
            <div className="h-40 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
