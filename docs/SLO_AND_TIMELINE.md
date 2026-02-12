# SLO / Error Budget and Event Timeline Features

This document introduces two newly implemented advanced operations features:

1. **SLO / Error Budget View**
2. **Timeline-based Event View**

---

## 1. SLO / Error Budget View

### Feature Overview

SLO (Service Level Objective) is the core mechanism for defining service commitments. Unlike traditional Uptime/Latency monitoring, SLO views provide:

- **Commitment Perspective**: Upgrade from "viewing data" to "viewing commitments"
- **Error Budget**: Quantify how much "tolerable" exceptions remain this week/month
- **Trend Analysis**: Historical compliance trends and predictions

### Core Concepts

#### SLO Definition

```typescript
{
  name: "Chainlink ETH/USD Latency SLO",
  protocol: "chainlink",
  chain: "ethereum",
  metricType: "latency",
  targetValue: 99.9,        // Target: 99.9% requests with latency < 2s
  thresholdValue: 95.0,     // Threshold: below 95% considered breach
  evaluationWindow: "30d",  // Evaluation window: 30 days
  errorBudgetPolicy: "monthly"
}
```

#### Error Budget Calculation

- **Total Budget**: Based on SLO target (e.g., 99.9% → 0.1% Error Budget)
- **Used**: Accumulation of non-compliant time windows
- **Remaining Budget**: Tolerable exceptions remaining in current cycle
- **Burn Rate**: Daily Error Budget consumption
- **Projected Depletion**: Prediction based on current consumption rate

### Page Features

Visit `/oracle/slo-v2` to view the SLO dashboard:

1. **Overview Cards**: Shows average compliance rate, compliant/at-risk/breached SLO counts
2. **SLO Card View**: Each SLO's detailed status, Error Budget gauge, trend chart
3. **List View**: Table format showing all SLOs' key metrics
4. **Event Timeline**: Associated alerts, disputes, and other events

### API Endpoints

- `GET /api/slo/definitions` - Get SLO definition list
- `POST /api/slo/definitions` - Create new SLO definition
- `GET /api/slo/reports` - Get SLO reports (includes Error Budget)
- `POST /api/slo/evaluate` - Manually trigger SLO evaluation

---

## 2. Event Timeline View

### Feature Overview

Event timeline integrates scattered system events into a unified timeline, helping users quickly answer:

- "Did this exception occur before or after the upgrade?"
- "Was there a dispute/alert triggered when this price spike happened?"
- "What happened before this dispute was created?"

### Supported Event Types

- `alert_triggered` / `alert_resolved` - Alert triggered/resolved
- `dispute_created` / `dispute_resolved` - Dispute created/resolved
- `deployment` - Deployment event
- `config_changed` - Configuration change
- `price_spike` / `price_drop` - Price anomaly
- `system_maintenance` - System maintenance
- `incident_created` / `incident_resolved` - Incident created/resolved
- `fix_completed` - Fix completed

### Core Features

1. **Timeline Display**: Grouped by date, vertical timeline layout
2. **Event Filtering**: Filter by type, severity, protocol, chain, trading pair
3. **Event Details**: Click event to view complete information and metadata
4. **Correlation Analysis**: Automatically identify related events (cause/effect/relevant)
5. **Time Window Query**: View events around specific time points

### Page Features

Visit `/oracle/timeline` to view the complete event timeline:

1. **Statistics Cards**: Today's events, alerts, disputes, deployment counts
2. **Timeline Component**: Scrollable event list with filtering
3. **Event Detail Panel**: Selected event details and related events

### API Endpoints

- `GET /api/timeline/events` - Query event list
- `POST /api/timeline/events` - Create new event
- `GET /api/timeline/events/:id` - Get single event details
- `GET /api/timeline/events/:id/correlations` - Get event correlations
- `GET /api/timeline/around` - Get events near specific time point
- `GET /api/timeline/summary` - Get event statistics summary

---

## 3. Database Models

### SLO Related Tables

```prisma
model SloDefinition {
  id          String   @id @default(uuid())
  name        String
  protocol    String
  chain       String
  metricType  String
  targetValue Decimal
  thresholdValue Decimal
  evaluationWindow String
  errorBudgetPolicy String
  conditionConfig Json?
  isActive    Boolean
  metrics     SloMetric[]
  errorBudgets ErrorBudget[]
}

model SloMetric {
  id            String   @id @default(uuid())
  sloId         String
  actualValue   Decimal
  targetValue   Decimal
  isCompliant   Boolean
  complianceRate Decimal
  totalEvents   Int
  goodEvents    Int
  badEvents     Int
  windowStart   DateTime
  windowEnd     DateTime
}

model ErrorBudget {
  id          String   @id @default(uuid())
  sloId       String
  periodStart DateTime
  periodEnd   DateTime
  totalBudget Decimal
  usedBudget  Decimal
  remainingBudget Decimal
  burnRate    Decimal
  projectedDepletion DateTime?
  status      String
}
```

### Event Timeline Table

```prisma
model EventTimeline {
  id          String   @id @default(uuid())
  eventType   String
  severity    String
  title       String
  description String?
  protocol    String?
  chain       String?
  symbol      String?
  entityType  String?
  entityId    String?
  metadata    Json?
  occurredAt  DateTime
  parentEventId String?
  relatedEventIds String[]
  source      String
  sourceUser  String?
}
```

---

## 4. Usage Guide

### Creating SLO

1. Visit `/oracle/slo-v2`
2. Click "New SLO" button
3. Fill in SLO parameters:
   - Name and description
   - Protocol and chain
   - Metric type (latency/availability/accuracy)
   - Target value and threshold
   - Evaluation window and Error Budget policy
4. Save, system will automatically start evaluation

### Viewing Event Timeline

1. Visit `/oracle/timeline`
2. Use filter buttons to filter event types
3. Click event to view details
4. View related events to understand event chain

### Creating Events in Code

```typescript
import { createTimelineEvent } from '@/server/timeline/eventTimelineService';

// Create alert event
await createTimelineEvent({
  eventType: 'alert_triggered',
  severity: 'warning',
  title: 'Price deviation detected',
  protocol: 'chainlink',
  chain: 'ethereum',
  symbol: 'ETH/USD',
  entityType: 'alert',
  entityId: 'alert-123',
  metadata: { deviation: 0.05, threshold: 0.01 },
});
```

---

## 5. Future Optimization Suggestions

1. **SLO Alerts**: Send alerts when Error Budget is about to deplete
2. **Auto-fix Suggestions**: Provide fix suggestions based on event correlation analysis
3. **SLO Templates**: Provide templates for common SLO configurations
4. **Event Workflow**: Support event acknowledgement, assignment, closing flow
5. **Integration with Existing Alert System**: Automatically convert alerts to timeline events

---

## 6. Migration Instructions

Run the following command to create database tables:

```bash
npx prisma migrate dev --name add_slo_and_event_timeline
```

Or create migration file manually then execute:

```bash
npx prisma migrate dev --create-only --name add_slo_and_event_timeline
npx prisma migrate deploy
```
