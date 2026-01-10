import { Dispute, Assertion } from "@/lib/oracleTypes";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export async function notifyAlert(alert: { 
  title: string; 
  message: string; 
  severity: "info" | "warning" | "critical"; 
  fingerprint: string 
}) {
  const url = env.INSIGHT_WEBHOOK_URL;
  if (!url) return;

  const emoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
  const content = `${emoji} **[${alert.severity.toUpperCase()}] ${alert.title}**\n${alert.message}\nID: \`${alert.fingerprint}\``;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (error) {
    logger.error("Failed to send webhook notification", { error });
  }
}

export async function notifyDispute(assertion: Assertion, dispute: Dispute) {
  logger.info(
    `\n🚨 [INSIGHT ALERT] Dispute Detected!\n` +
      `------------------------------------\n` +
      `Market:    ${assertion.market}\n` +
      `Assertion: ${assertion.assertion}\n` +
      `Reason:    ${dispute.disputeReason}\n` +
      `Disputer:  ${dispute.disputer}\n` +
      `Tx Hash:   ${assertion.txHash}\n` +
      `------------------------------------\n`
  );

  await notifyAlert({
    title: "Dispute Detected",
    message: `Market: ${assertion.market}\nReason: ${dispute.disputeReason}\nAssertion: ${assertion.assertion}`,
    severity: "critical",
    fingerprint: `dispute:${assertion.id}`
  });
}
