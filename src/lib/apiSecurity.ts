import crypto from "crypto";
import { logger } from "@/lib/logger";

const API_SECRET =
  process.env.INSIGHT_API_SECRET || "default-dev-secret-change-in-production";

export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateTimestamp(): number {
  return Date.now();
}

export function signRequest(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  nonce: string,
): string {
  const payload = `${method}:${path}:${timestamp}:${nonce}:${body}`;
  return crypto.createHmac("sha256", API_SECRET).update(payload).digest("hex");
}

export function verifySignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  nonce: string,
  signature: string,
): boolean {
  const maxAge = 5 * 60 * 1000;
  const age = Date.now() - timestamp;

  if (age > maxAge) {
    logger.warn("Request timestamp too old", { age, maxAge });
    return false;
  }

  const expectedSignature = signRequest(method, path, body, timestamp, nonce);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );

  if (!isValid) {
    logger.warn("Invalid signature detected", { method, path });
  }

  return isValid;
}

const nonceCache = new Set<string>();

export function verifyNonce(nonce: string): boolean {
  if (nonceCache.has(nonce)) {
    logger.warn("Nonce reuse detected", { nonce });
    return false;
  }

  nonceCache.add(nonce);

  if (nonceCache.size > 10000) {
    const oldestNonces = Array.from(nonceCache).slice(0, 5000);
    oldestNonces.forEach((n) => nonceCache.delete(n));
  }

  setTimeout(
    () => {
      nonceCache.delete(nonce);
    },
    15 * 60 * 1000,
  );

  return true;
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function encryptData(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(API_SECRET, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedHex = parts[2];

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "utf8");

  const key = crypto.scryptSync(API_SECRET, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

export function generateApiKey(): { key: string; secret: string } {
  const newKey = `insight_${crypto.randomBytes(8).toString("hex")}`;
  const secret = crypto.randomBytes(32).toString("hex");

  const hashedSecret = crypto.createHash("sha256").update(secret).digest("hex");

  return { key: newKey, secret: hashedSecret };
}

export function validateApiKey(_key: string, secret: string): boolean {
  const expectedSecret = crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSecret),
    Buffer.from(secret),
  );
}

export const apiSecurity = {
  generateNonce,
  generateTimestamp,
  signRequest,
  verifySignature,
  verifyNonce,
  hashSensitiveData,
  encryptData,
  decryptData,
  generateApiKey,
  validateApiKey,
};

export default apiSecurity;
