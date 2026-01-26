export function AssertionDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex h-9 w-24 items-center gap-2 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 px-3 py-2" />

        <div className="glass-panel flex flex-col gap-6 rounded-3xl border border-white/60 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-48 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-7 w-24 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-32 rounded-md bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <div className="h-5 w-24 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <div className="h-4 w-20 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-8 w-32 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Assertion Info */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card overflow-hidden rounded-3xl border border-white/60 p-8">
            {/* Background decoration */}
            <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-[0.03]">
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
              <div className="h-8 w-52 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-5 w-5 rounded-md bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>

            <div className="mb-8 h-32 w-full rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-6" />

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                  <div className="h-3 w-3 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
                </div>
                <div className="h-16 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 p-5" />
              </div>

              {/* Additional info sections */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-4"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="glass-card rounded-3xl border border-white/60 p-8">
            <div className="mb-6 h-7 w-32 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-40 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                    <div className="h-3 w-full rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                    <div className="h-3 w-2/3 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card sticky top-24 rounded-3xl border border-white/60 p-6">
            <div className="mb-6 h-6 w-32 rounded bg-gradient-to-r from-gray-200 to-gray-300" />

            {/* Actions */}
            <div className="space-y-3">
              <div className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-12 w-full rounded-xl bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>

            {/* Dispute info */}
            <div className="mt-8 space-y-4">
              <div className="h-5 w-24 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-20 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-20 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                  <div className="h-4 w-16 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-gray-100 to-gray-200">
                  <div className="h-full w-1/2 bg-gradient-to-r from-gray-200 to-gray-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Payout Simulator */}
          <div className="glass-card rounded-3xl border border-white/60 p-6">
            <div className="mb-4 h-5 w-32 rounded bg-gradient-to-r from-gray-200 to-gray-300" />
            <div className="h-40 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
