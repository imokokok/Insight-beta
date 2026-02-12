# Page-to-Page Operation Flow Documentation

> Complete path design from "seeing the problem" to "solving the problem"

## Design Principles

1. **2-3 Step Rule**: From any anomaly, reach the resolution path in max 2-3 steps
2. **Context Preservation**: Carry necessary context parameters when navigating (symbol, protocol, severity, etc.)
3. **Bidirectional Navigation**: Support returning to overview from problem, and diving into problem from overview

---

## 1. Price Deviation Flow

### Trigger Scenarios

- Alerts panel on Dashboard shows price deviation alerts
- Abnormal price points marked on OracleCharts
- `/oracle/analytics/deviation` page shows anomaly list

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Discover Problem                                       │
├─────────────────────────────────────────────────────────────────┤
│  Entry Options:                                                  │
│  • Dashboard → Alerts Panel → Click "Chainlink ETH/USD Deviation > 2%" │
│  • Dashboard → Price Trends → Click abnormal data point          │
│  • /oracle/analytics/deviation → Click a row of abnormal data   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: View Details                                           │
├─────────────────────────────────────────────────────────────────┤
│  Target: /oracle/feeds?symbol=ETH-USD&protocol=chainlink       │
│                                                                  │
│  Page Content:                                                  │
│  • Price chart (highlighted abnormal time period)               │
│  • Related alerts list                                          │
│  • Same price source comparison with other protocols             │
│  • [View Protocol Details] button → /oracle/protocols/chainlink │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Handle Problem (Optional Branches)                     │
├─────────────────────────────────────────────────────────────────┤
│  Branch A - View Protocol Health:                               │
│  • Click [Protocol Health] → /oracle/protocols/chainlink#health│
│                                                                  │
│  Branch B - View Related Disputes:                              │
│  • Click [Related Disputes] → /disputes?symbol=ETH-USD&protocol=chainlink│
│                                                                  │
│  Branch C - Acknowledge Alert:                                  │
│  • Click [Acknowledge Alert] → /alerts?symbol=ETH-USD&action=ack│
└─────────────────────────────────────────────────────────────────┘
```

### Route Parameter Conventions

```typescript
// Price Feed Detail Page Parameters
interface PriceFeedQueryParams {
  symbol: string; // Price source identifier, e.g., "ETH-USD"
  protocol?: string; // Protocol filter, e.g., "chainlink"
  timeframe?: string; // Time range, e.g., "1h", "24h"
  highlight?: string; // Highlight time period, e.g., "2024-01-15T10:00:00Z"
}

// Alerts Page Parameters
interface AlertsQueryParams {
  symbol?: string; // Price source filter
  protocol?: string; // Protocol filter
  severity?: 'critical' | 'warning' | 'info';
  status?: 'open' | 'acked' | 'resolved';
  action?: 'ack' | 'resolve'; // Quick action
}
```

---

## 2. Protocol Health Anomaly Flow

### Trigger Scenarios

- Dashboard Health Status shows "Degraded" or "Incident"
- Protocol Health Grid shows a protocol with degraded health
- Received protocol offline alert

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Discover Problem                                       │
├─────────────────────────────────────────────────────────────────┤
│  Entry Options:                                                  │
│  • Dashboard → Health Status Badge → Click "Degraded"           │
│  • Dashboard → Protocol Health Grid → Click abnormal protocol  │
│  • Alerts Tab → Click protocol-related alert                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: View Protocol Details                                 │
├─────────────────────────────────────────────────────────────────┤
│  Target: /oracle/protocols/{protocol}                          │
│                                                                  │
│  Page Content:                                                  │
│  • Protocol overview (TVS, node count, health score)            │
│  • Real-time price feeds list                                   │
│  • Health metrics (Uptime, Latency, Accuracy)                  │
│  • Active Alerts                                                │
│  • [View Disputes] button → /disputes?protocol={protocol}      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Deep Investigation (Optional Branches)                 │
├─────────────────────────────────────────────────────────────────┤
│  Branch A - View Specific Feed:                                 │
│  • Click a price source → /oracle/feeds?protocol={protocol}    │
│                                                                  │
│  Branch B - Compare Protocols:                                   │
│  • Click [Comparison Analysis] → /oracle/comparison?protocols={protocol}│
│                                                                  │
│  Branch C - View Historical Events:                             │
│  • Click [Event Timeline] → /oracle/protocols/{protocol}/timeline│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Alert Handling Flow

### Trigger Scenarios

- Dashboard receives new Critical Alert
- Alerts Tab shows unhandled alert list
- Received alert notification via email/notification

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: View Alert List                                       │
├─────────────────────────────────────────────────────────────────┤
│  Entry: /alerts or Dashboard Alerts Tab                        │
│                                                                  │
│  Actions:                                                       │
│  • Filter: severity=critical, status=open                      │
│  • Sort: time descending, highest priority first               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Choose Handling Method                                │
├─────────────────────────────────────────────────────────────────┤
│  Option A - Quick Acknowledge:                                  │
│  • Click [Ack] button → Mark as acknowledged, status changes to acked│
│                                                                  │
│  Option B - View Details:                                       │
│  • Click alert row → /alerts/{id}                              │
│                                                                  │
│  Option C - Navigate to Related Pages:                          │
│  • [View in Protocol] → /oracle/protocols/{protocol}           │
│  • [View Feed] → /oracle/feeds?symbol={symbol}                │
│  • [Timeline] → /alerts/{id}/timeline                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Resolve Problem                                        │
├─────────────────────────────────────────────────────────────────┤
│  • Investigate problem based on detail page info               │
│  • Click [Resolve] to mark as resolved                         │
│  • Or create Dispute → /disputes/create?alertId={id}           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Optimistic Oracle Flow (Assertion/Dispute Flow)

### Trigger Scenarios

- Viewing assertion status of Optimistic Oracle like UMA
- Found suspicious assertion that needs dispute
- Need to audit historical assertion and dispute records

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Enter Optimistic Oracle Center                         │
├─────────────────────────────────────────────────────────────────┤
│  Entry Options:                                                 │
│  • /oracle/optimistic              - Overview page             │
│  • /oracle/optimistic/assertions   - Assertion list            │
│  • /oracle/optimistic/disputes     - Dispute list              │
│                                                                  │
│  Views:                                                         │
│  • Active Assertions                                            │
│  • Expired Assertions (pending settlement)                      │
│  • Active Disputes                                             │
│  • Settled Disputes                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: View Assertion Details                                 │
├─────────────────────────────────────────────────────────────────┤
│  Entry: Click a row in Assertion list → /oracle/optimistic/assertions/{id}│
│                                                                  │
│  Detail Page Content:                                           │
│  • Assertion basic info (price, time, asserter)                 │
│  • Current status (active/disputed/settled)                    │
│  • Remaining dispute time (countdown)                          │
│  • Related disputes list (if any)                               │
│                                                                  │
│  Action Buttons:                                                │
│  • [Initiate Dispute] - If still in dispute window              │
│  • [View Related Dispute] - If already disputed                  │
│  • [Create Alert] - Create monitoring alert for this assertion │
│  • [View Audit Record] - Jump to audit log                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Branch Operations                                     │
├─────────────────────────────────────────────────────────────────┤
│  Branch A - Initiate Dispute:                                   │
│  • Click [Initiate Dispute] → /oracle/optimistic/disputes/create?assertionId={id}│
│  • Fill in dispute reason and bond amount                       │
│  • Submit → Enter dispute detail page                           │
│                                                                  │
│  Branch B - View Related Dispute:                               │
│  • Click [View Related Dispute] → /oracle/optimistic/disputes/{disputeId}│
│  • View evidence from both parties                              │
│  • Participate in voting (if still in voting period)            │
│                                                                  │
│  Branch C - Create/View Alert:                                 │
│  • Click [Create Alert] → /alerts/create?type=assertion&target={id}│
│  • Or click [View Alert] → /alerts?target={id}                 │
│                                                                  │
│  Branch D - Audit Trail:                                        │
│  • Click [View Audit Record] → /audit?category=optimistic&target={id}│
│  • View all operation history of this assertion                 │
└─────────────────────────────────────────────────────────────────┘
```

### Route Parameter Conventions

```typescript
// Optimistic Oracle Assertion Detail Page Parameters
interface AssertionQueryParams {
  id: string; // Assertion ID
  view?: 'overview' | 'disputes' | 'timeline'; // Default view
}

// Optimistic Oracle Dispute Related Parameters
interface OptimisticDisputeParams {
  assertionId?: string; // Associated assertion ID
  status?: 'active' | 'resolved' | 'all';
}

// Audit Log Filter Parameters
interface AuditQueryParams {
  category?: 'optimistic' | 'assertion' | 'dispute' | 'alert';
  target?: string; // Target object ID
  action?: string; // Action type
  startTime?: string; // Start time
  endTime?: string; // End time
}
```

---

## 5. Security Incident Flow

### Trigger Scenarios

- Security Dashboard shows security risk cards
- Detected security events like price manipulation, abnormal transactions
- Need to audit security-related alerts and disputes

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Discover Security Risk                                 │
├─────────────────────────────────────────────────────────────────┤
│  Entry: /security/dashboard                                    │
│                                                                  │
│  Risk Card Types:                                               │
│  • 🔴 Price Manipulation Detection                              │
│  • 🟠 Anomalous Trading Pattern                                │
│  • 🟡 Liquidity Anomaly                                        │
│  • 🔵 Oracle Latency                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: View Risk Details                                      │
├─────────────────────────────────────────────────────────────────┤
│  Click risk card → Expand/jump to detail                       │
│                                                                  │
│  Detail Content:                                                │
│  • Risk description and severity                                │
│  • Affected protocols/assets list                               │
│  • Detection time range                                         │
│  • Related evidence (transaction records, price charts)         │
│                                                                  │
│  Action Buttons:                                                │
│  • [View Related Alerts] → Filtered alert list                  │
│  • [View Related Disputes] → Filtered dispute list             │
│  • [Create Alert] → Create alert for this security event       │
│  • [Export Report] → Generate security audit report            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Handle Security Event (Branches)                       │
├─────────────────────────────────────────────────────────────────┤
│  Branch A - View Related Alerts:                                 │
│  • Click [View Related Alerts]                                  │
│  • Jump: /alerts?category=security&riskType={type}&asset={asset}│
│  • Auto-filter: Only show alerts related to this security event│
│                                                                  │
│  Branch B - View Related Disputes:                             │
│  • Click [View Related Disputes]                                │
│  • Jump: /disputes?category=security&riskType={type}&asset={asset}│
│  • Auto-filter: Only show disputes related to this security event│
│                                                                  │
│  Branch C - Initiate Dispute:                                  │
│  • If discovered security issue that needs dispute              │
│  • Click [Initiate Dispute] → /disputes/create?source=security&riskId={id}│
│                                                                  │
│  Branch D - Audit Trail:                                        │
│  • Click [View Audit Log] → /audit?category=security&target={id}│
│  • View complete operation history of this security event       │
└─────────────────────────────────────────────────────────────────┘
```

### Route Parameter Conventions

```typescript
// Security Dashboard Risk Filter Parameters
interface SecurityRiskQueryParams {
  riskType?: 'manipulation' | 'anomaly' | 'liquidity' | 'latency';
  asset?: string; // Asset identifier, e.g., "ETH"
  protocol?: string; // Protocol filter, e.g., "chainlink"
  severity?: 'critical' | 'high' | 'medium' | 'low';
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

// Alerts Page Security-related Filters
interface SecurityAlertsQueryParams {
  category?: 'security'; // Fixed value, indicates security category alerts
  riskType?: string; // Risk type
  asset?: string; // Asset filter
  protocol?: string; // Protocol filter
  source?: 'security'; // Source: security detection system
  riskId?: string; // Associated risk event ID
}

// Disputes Page Security-related Filters
interface SecurityDisputesQueryParams {
  category?: 'security'; // Fixed value, indicates security category disputes
  riskType?: string; // Risk type
  asset?: string; // Asset filter
  protocol?: string; // Protocol filter
  source?: 'security'; // Source: security detection system
  riskId?: string; // Associated risk event ID
}
```

### Navigation Examples

```typescript
// Navigate from Security Dashboard to Related Alerts
const navigateToRelatedAlerts = (riskCard: SecurityRiskCard) => {
  const params = new URLSearchParams({
    category: 'security',
    riskType: riskCard.type,
    asset: riskCard.affectedAsset,
    protocol: riskCard.affectedProtocol,
    source: 'security',
    riskId: riskCard.id,
  });
  window.location.href = `/alerts?${params.toString()}`;
};

// Navigate from Security Dashboard to Related Disputes
const navigateToRelatedDisputes = (riskCard: SecurityRiskCard) => {
  const params = new URLSearchParams({
    category: 'security',
    riskType: riskCard.type,
    asset: riskCard.affectedAsset,
    protocol: riskCard.affectedProtocol,
    source: 'security',
    riskId: riskCard.id,
  });
  window.location.href = `/disputes?${params.toString()}`;
};
```

---

## 6. Dispute Handling Flow

### Trigger Scenarios

- Found price anomaly that needs dispute
- Received dispute notification that needs voting
- View historical dispute records

### Operation Path

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Enter Dispute Center                                   │
├─────────────────────────────────────────────────────────────────┤
│  Entry: /disputes                                              │
│                                                                  │
│  Views:                                                         │
│  • Active Disputes (pending vote)                               │
│  • My Disputes (initiated by me)                               │
│  • History (ended)                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Initiate or Participate                                │
├─────────────────────────────────────────────────────────────────┤
│  Option A - Initiate Dispute:                                   │
│  • [Initiate Dispute] → /disputes/create                        │
│  • Select price source → Fill reason → Submit                   │
│                                                                  │
│  Option B - Participate in Voting:                              │
│  • Click Active Dispute → /disputes/{id}                       │
│  • View evidence → Choose stance → Submit vote                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Track Results                                          │
├─────────────────────────────────────────────────────────────────┤
│  • View voting progress on detail page                          │
│  • View result after dispute ends                               │
│  • Click [Related Alert] to return to alert context            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Navigation Reference Table

| From                  | To                | Route                                | Parameters                               |
| --------------------- | ----------------- | ------------------------------------ | ---------------------------------------- |
| Dashboard Alert       | Feed Details      | `/oracle/feeds`                      | `symbol`, `protocol`                     |
| Dashboard Alert       | Protocol Details  | `/oracle/protocols/{protocol}`       | -                                        |
| Protocol Details      | Feed List         | `/oracle/feeds`                      | `protocol`                               |
| Protocol Details      | Dispute List      | `/disputes`                          | `protocol`                               |
| Feed Details          | Protocol Details  | `/oracle/protocols/{protocol}`       | -                                        |
| Feed Details          | Alerts            | `/alerts`                            | `symbol`, `protocol`                     |
| Alert List            | Alert Details     | `/alerts/{id}`                       | -                                        |
| Alert Details         | Feed Details      | `/oracle/feeds`                      | `symbol`                                 |
| Alert Details         | Initiate Dispute  | `/disputes/create`                   | `alertId`                                |
| Dispute List          | Dispute Details   | `/disputes/{id}`                     | -                                        |
| Dispute Details       | Related Alert     | `/alerts/{id}`                       | -                                        |
| **Optimistic Oracle** |                   |                                      |                                          |
| Assertion List        | Assertion Details | `/oracle/optimistic/assertions/{id}` | -                                        |
| Assertion Details     | Initiate Dispute  | `/oracle/optimistic/disputes/create` | `assertionId`                            |
| Assertion Details     | View Dispute      | `/oracle/optimistic/disputes/{id}`   | -                                        |
| Assertion Details     | Create Alert      | `/alerts/create`                     | `type=assertion`, `target`               |
| Assertion Details     | Audit Record      | `/audit`                             | `category=optimistic`, `target`          |
| **Security**          |                   |                                      |                                          |
| Security Dashboard    | Related Alerts    | `/alerts`                            | `category=security`, `riskType`, `asset` |
| Security Dashboard    | Related Disputes  | `/disputes`                          | `category=security`, `riskType`, `asset` |
| Security Dashboard    | Initiate Dispute  | `/disputes/create`                   | `source=security`, `riskId`              |
| Security Dashboard    | Audit Record      | `/audit`                             | `category=security`, `target`            |

---

## Feature Checklist (To Be Implemented)

### Core Pages

- [ ] `/oracle/feeds` - Price feed detail page
- [ ] `/oracle/feeds?symbol=XXX` - Specific price feed filter
- [ ] `/oracle/analytics/deviation` - Price deviation analysis page
- [ ] `/alerts/{id}` - Alert detail page
- [ ] `/alerts/{id}/timeline` - Alert timeline
- [ ] `/oracle/protocols/{protocol}/timeline` - Protocol event timeline
- [ ] `/disputes/create` - Initiate dispute page

### Optimistic Oracle Pages

- [ ] `/oracle/optimistic` - Optimistic Oracle overview page
- [ ] `/oracle/optimistic/assertions` - Assertion list page
- [ ] `/oracle/optimistic/assertions/{id}` - Assertion detail page
- [ ] `/oracle/optimistic/disputes` - Dispute list page
- [ ] `/oracle/optimistic/disputes/{id}` - Dispute detail page
- [ ] `/oracle/optimistic/disputes/create` - Initiate dispute page

### Audit & Tracking

- [ ] `/audit` - Audit log overview
- [ ] `/audit?category=optimistic` - Optimistic Oracle audit records

### Security Monitoring Pages

- [ ] `/security/dashboard` - Security monitoring dashboard
- [ ] `/security/manipulation` - Price manipulation detection
- [ ] `/security/anomaly` - Anomalous transaction detection
- [ ] `/security/reports` - Security report center

### Global Features

- [ ] Global search: Support quick navigation for symbol/protocol/alert
- [ ] Unified filter component: Support filter parameter passing across pages
