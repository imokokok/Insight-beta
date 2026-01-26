// OpenTelemetry client-side initialization (browser)
// This is a no-op for client-side to avoid bundle size impact

export default function initOpenTelemetryClient() {
  // Client-side OpenTelemetry is disabled by default
  // Uncomment the following code to enable it
  /*
  if (typeof window !== 'undefined') {
    console.log('OpenTelemetry client-side initialization skipped');
  }
  */
}
