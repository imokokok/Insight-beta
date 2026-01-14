import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleApi, cachedJson } from "./apiResponse";
import { chaosInjector } from "@/lib/chaos";
import * as kvStoreModule from "@/server/kvStore";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Spy on the kvStore functions instead of mocking the entire module
const mockReadJsonFile = vi
  .spyOn(kvStoreModule, "readJsonFile")
  .mockResolvedValue(null);
const mockWriteJsonFile = vi
  .spyOn(kvStoreModule, "writeJsonFile")
  .mockResolvedValue(undefined);

describe("Chaos Engineering Tests for API Response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAOS_ENABLED = "true";
  });

  afterEach(() => {
    delete process.env.CHAOS_ENABLED;
  });

  describe("handleApi with network delays", () => {
    it("should handle network delays gracefully", async () => {
      // Create a test function that takes time to execute
      const testFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { message: "success" };
      };

      // Execute handleApi and verify it completes successfully
      const response = await handleApi(
        new Request("http://localhost/api/test"),
        testFn,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  describe("cachedJson with database failures", () => {
    it("should handle readJsonFile failures", async () => {
      // Mock readJsonFile to throw an error
      mockReadJsonFile.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const key = "test-key";
      const computedValue = { message: "computed" };
      const ttlMs = 60_000;

      // Execute cachedJson and verify it falls back to compute function
      const result = await cachedJson(key, ttlMs, async () => {
        return computedValue;
      });

      expect(result).toEqual(computedValue);
    });

    it("should handle writeJsonFile failures", async () => {
      // Mock writeJsonFile to throw an error
      mockReadJsonFile.mockResolvedValue(null);
      mockWriteJsonFile.mockRejectedValue(new Error("Database write failed"));

      const key = "test-key";
      const computedValue = { message: "computed" };
      const ttlMs = 60_000;

      // Execute cachedJson and verify it doesn't crash when write fails
      const result = await cachedJson(key, ttlMs, async () => {
        return computedValue;
      });

      expect(result).toEqual(computedValue);
    });

    it("should handle concurrent cache access", async () => {
      // Mock readJsonFile to return null initially
      mockReadJsonFile.mockResolvedValue(null);

      const key = "concurrent-key";
      const computedValue = { message: "computed" };
      const ttlMs = 60_000;

      // Simulate concurrent calls to cachedJson
      const promises = Array.from({ length: 10 }, () =>
        cachedJson(key, ttlMs, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return computedValue;
        }),
      );

      // All promises should resolve successfully
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toEqual(computedValue);
      });
    });
  });

  describe("handleApi with service failures", () => {
    it("should handle Zod validation failures", async () => {
      // Create a function that throws a Zod error
      const zodErrorFn = async () => {
        const { z } = await import("zod");
        const schema = z.string();
        return schema.parse(123); // This will throw a ZodError
      };

      const response = await handleApi(
        new Request("http://localhost/api/test"),
        zodErrorFn,
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBeDefined();
    });

    it("should handle internal server errors", async () => {
      // Create a function that throws an error
      const errorFn = async () => {
        throw new Error("Internal server error");
      };

      const response = await handleApi(
        new Request("http://localhost/api/test"),
        errorFn,
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("unknown_error");
    });

    it("should handle database connection failures", async () => {
      // Mock readJsonFile to throw an error for this test
      mockReadJsonFile.mockRejectedValue(
        new Error("Database connection timed out"),
      );

      const response = await handleApi(
        new Request("http://localhost/api/test"),
        async () => {
          return { message: "success" };
        },
      );

      // The request should either succeed or fail gracefully
      expect(response.status).toBe(200);
    });
  });

  describe("chaosInjector functionality", () => {
    it("should start and stop chaos tests", () => {
      // Start chaos injector
      chaosInjector.start();
      // Stop chaos injector
      chaosInjector.stop();

      // No assertions needed, just verifying it doesn't crash
      expect(true).toBe(true);
    });
  });

  describe("fault tolerance with random failures", () => {
    it("should handle random failures in dependencies", async () => {
      // Mock readJsonFile to throw an error
      mockReadJsonFile.mockRejectedValue(new Error("Random read failure"));

      const key = "test-fault-tolerance";
      const computedValue = { message: "computed" };
      const ttlMs = 60_000;

      const result = await cachedJson(key, ttlMs, async () => {
        return computedValue;
      });

      expect(result).toEqual(computedValue);
    });
  });

  describe("performance under stress", () => {
    it("should handle multiple concurrent requests", async () => {
      const requestCount = 20;
      const promises = [];

      // Create multiple concurrent requests
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          handleApi(new Request(`http://localhost/api/test/${i}`), async () => {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 10),
            );
            return { id: i };
          }),
        );
      }

      // All requests should complete without crashing
      const responses = await Promise.all(promises);
      expect(responses.length).toBe(requestCount);

      // Most requests should succeed
      const successfulResponses = responses.filter((res) => res.status === 200);
      expect(successfulResponses.length).toBeGreaterThanOrEqual(
        requestCount * 0.8,
      ); // At least 80% success rate
    });
  });
});
