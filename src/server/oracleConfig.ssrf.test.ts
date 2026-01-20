import { afterEach, describe, expect, it, vi } from "vitest";
import { validateOracleConfigPatch } from "./oracleConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("oracleConfig rpcUrl SSRF guard", () => {
  it("rejects private rpcUrl in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSIGHT_ALLOW_PRIVATE_RPC_URLS", "");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "http://localhost:8545" }),
    ).toThrowError("invalid_rpc_url");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "http://127.0.0.1:8545" }),
    ).toThrowError("invalid_rpc_url");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "http://10.0.0.10:8545" }),
    ).toThrowError("invalid_rpc_url");
  });

  it("allows private rpcUrl in production when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSIGHT_ALLOW_PRIVATE_RPC_URLS", "true");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "http://localhost:8545" }),
    ).not.toThrow();
  });

  it("allows private rpcUrl in non-production by default", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("INSIGHT_ALLOW_PRIVATE_RPC_URLS", "");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "http://localhost:8545" }),
    ).not.toThrow();
  });

  it("rejects rpcUrl with basic auth credentials", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(() =>
      validateOracleConfigPatch({ rpcUrl: "https://user:pass@rpc.example" }),
    ).toThrowError("invalid_rpc_url");
  });
});
