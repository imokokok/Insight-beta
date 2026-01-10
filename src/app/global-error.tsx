'use client'
 
import { useEffect } from 'react'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optionally log to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
          <p className="text-gray-600 mb-8 max-w-md">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => reset()}
              className="rounded bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-700"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
