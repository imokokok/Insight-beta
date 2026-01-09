import { Dispute, Assertion } from "@/lib/oracleTypes";

export async function notifyDispute(assertion: Assertion, dispute: Dispute) {
  console.log(`
🚨 [INSIGHT ALERT] Dispute Detected!
------------------------------------
Market:    ${assertion.market}
Assertion: ${assertion.assertion}
Reason:    ${dispute.disputeReason}
Disputer:  ${dispute.disputer}
Tx Hash:   ${assertion.txHash}
------------------------------------
`);

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
