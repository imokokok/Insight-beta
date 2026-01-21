import { getAssertion, getDisputeByAssertionId } from "@/server/oracle";
import { listAlerts, type Alert } from "@/server/observability";
import { error, handleApi, rateLimit } from "@/server/apiResponse";
import type { Assertion, Dispute } from "@/lib/oracleTypes";

type TimelineEvent =
  | { type: "assertion_created"; at: string; assertion: Assertion }
  | { type: "assertion_resolved"; at: string; assertion: Assertion }
  | { type: "dispute_created"; at: string; dispute: Dispute }
  | { type: "dispute_executed"; at: string; dispute: Dispute }
  | { type: `alert_${string}`; at: string; alert: Alert };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "assertion_timeline_get",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");
    const assertion = instanceId
      ? await getAssertion(id, instanceId)
      : await getAssertion(id);
    if (!assertion) return error({ code: "not_found" }, 404);

    const dispute = instanceId
      ? await getDisputeByAssertionId(id, instanceId)
      : await getDisputeByAssertionId(id);
    const alertsResult = await listAlerts({
      status: "All",
      severity: "All",
      type: "All",
      q: id,
      limit: 100,
      cursor: 0,
      instanceId,
    });

    const alerts = alertsResult.items.filter(
      (a) => a.entityType === "assertion" && a.entityId === id,
    );

    const events: TimelineEvent[] = [];

    events.push({
      type: "assertion_created",
      at: assertion.assertedAt,
      assertion,
    });

    if (dispute) {
      events.push({
        type: "dispute_created",
        at: dispute.disputedAt,
        dispute,
      });
    }

    for (const alert of alerts) {
      events.push({
        type: `alert_${alert.type}`,
        at: alert.firstSeenAt,
        alert,
      });
    }

    if (assertion.resolvedAt) {
      events.push({
        type: "assertion_resolved",
        at: assertion.resolvedAt,
        assertion,
      });
    }

    if (dispute && dispute.status === "Executed" && dispute.votingEndsAt) {
      events.push({
        type: "dispute_executed",
        at: dispute.votingEndsAt,
        dispute,
      });
    }

    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return {
      assertion,
      dispute,
      alerts,
      timeline: events,
    };
  });
}
