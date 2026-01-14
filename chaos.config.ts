// Chaos Engineering Configuration
// This file defines the chaos testing rules and parameters

export interface ChaosTestConfig {
  // Test name and description
  name: string;
  description: string;

  // Test type: network, service, data, infrastructure
  type: "network" | "service" | "data" | "infrastructure";

  // Enabled flag
  enabled: boolean;

  // Frequency: how often to run the test (milliseconds)
  frequency: number;

  // Duration: how long the test should run (milliseconds)
  duration: number;

  // Failure probability: 0-1
  failureProbability: number;

  // Scope: which components/services to target
  scope: string[];

  // Minimum/maximum impact percentage
  minImpact: number;
  maxImpact: number;
}

// Chaos test configurations
export const chaosTests: ChaosTestConfig[] = [
  {
    name: "network-delay",
    description: "Inject network delays into API requests",
    type: "network",
    enabled: true,
    frequency: 30000, // Every 30 seconds
    duration: 5000, // Last 5 seconds
    failureProbability: 0.3, // 30% chance
    scope: ["/api/oracle/*"],
    minImpact: 100, // 100ms delay
    maxImpact: 2000, // 2s delay
  },
  {
    name: "service-unavailable",
    description: "Simulate service unavailability",
    type: "service",
    enabled: true,
    frequency: 60000, // Every minute
    duration: 3000, // Last 3 seconds
    failureProbability: 0.1, // 10% chance
    scope: ["/api/oracle/assertions"],
    minImpact: 1,
    maxImpact: 1,
  },
  {
    name: "database-query-timeout",
    description: "Simulate database query timeouts",
    type: "service",
    enabled: true,
    frequency: 45000, // Every 45 seconds
    duration: 4000, // Last 4 seconds
    failureProbability: 0.2, // 20% chance
    scope: ["database"],
    minImpact: 1000, // 1s timeout
    maxImpact: 5000, // 5s timeout
  },
  {
    name: "memory-pressure",
    description: "Simulate high memory usage",
    type: "infrastructure",
    enabled: false, // Disabled by default
    frequency: 120000, // Every 2 minutes
    duration: 10000, // Last 10 seconds
    failureProbability: 0.05, // 5% chance
    scope: ["worker"],
    minImpact: 50, // 50% memory usage
    maxImpact: 80, // 80% memory usage
  },
];

// Global chaos configuration
export const globalChaosConfig = {
  // Enable/disable all chaos tests
  enabled: process.env.CHAOS_ENABLED === "true",

  // Maximum concurrent tests
  maxConcurrentTests: 2,

  // Dry run mode: simulate but don't actually inject failures
  dryRun: process.env.CHAOS_DRY_RUN === "true",

  // Minimum time between tests
  minInterval: 10000, // 10 seconds
};
