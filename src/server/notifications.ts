import { Dispute, Assertion } from "@/lib/oracleTypes";
import { logger } from "@/lib/logger";

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

  // In a production environment, you would trigger a webhook here:
  // if (process.env.DISCORD_WEBHOOK_URL) {
  //   await fetch(process.env.DISCORD_WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       content: `🚨 **Dispute Detected**\nMarket: ${assertion.market}\nReason: ${dispute.disputeReason}`
  //     })
  //   });
  // }
}
