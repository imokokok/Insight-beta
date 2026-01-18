import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath: string) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/\r/g, "");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!key) continue;
      const existing = process.env[key];
      if (existing !== undefined && existing !== "") continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    return;
  }
}

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));

function normalizePrivateKey(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

const deployerPrivateKey = normalizePrivateKey(
  process.env.DEPLOYER_PRIVATE_KEY,
);
const deployerAccounts = deployerPrivateKey ? [deployerPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: deployerAccounts,
    },
    polygonAmoy: {
      url:
        process.env.POLYGON_AMOY_RPC_URL ||
        "https://rpc-amoy.polygon.technology/",
      accounts: deployerAccounts,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: deployerAccounts,
    },
  },
};

export default config;
