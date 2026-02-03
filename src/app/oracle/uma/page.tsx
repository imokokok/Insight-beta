'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from old UMA route to new Optimistic Oracle route
 * This ensures backward compatibility for existing bookmarks/links
 */
export default function UMAOracleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new optimistic oracle page
    router.replace('/oracle/optimistic');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0F] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-gray-400">Redirecting to Optimistic Oracle...</p>
        <p className="mt-2 text-sm text-gray-500">
          UMA Oracle has been renamed to Optimistic Oracle
        </p>
      </div>
    </div>
  );
}
