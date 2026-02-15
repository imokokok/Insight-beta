# User Manual

## Quick Start

1. **Connect Wallet** - Click the "Connect Wallet" button in the top right
2. **Browse Data** - View aggregated price data on the Dashboard
3. **View Protocols** - Visit different protocols for detailed information
4. **Complete Onboarding** - First-time visitors will automatically see the onboarding guide

## Core Features

- **Multi-Protocol Price Monitoring** - Real-time aggregation of oracle price data from 4 protocols
- **Deviation Analytics** - Advanced price deviation analysis with trend detection and anomaly identification
- **UMA Assertions** - Create, dispute, and settle assertions
- **Alert Notifications** - Price deviation alerts and notifications
- **Security Monitoring** - Price manipulation detection and security alerts

## Page Navigation

| Page       | Function                                      |
| ---------- | --------------------------------------------- |
| Dashboard  | System overview, price aggregation, KPI cards |
| Oracle     | Oracle details, price charts                  |
| Protocols  | Protocol details and comparison               |
| UMA        | UMA assertions and dispute management         |
| Alerts     | Alert configuration and management            |
| Monitoring | System monitoring and metrics                 |
| Security   | Security monitoring and detection             |
| Audit      | Operation logs and auditing                   |
| Watchlist  | Favorited asset list                          |

## Supported Protocols

- **Chainlink** - Industry-standard price feeds and data oracles
- **Pyth** - Low-latency financial data from institutional sources
- **RedStone** - Modular oracle optimized for L2s and rollups
- **UMA** - Optimistic Oracle with assertion and dispute mechanisms

## FAQ

**How to view price comparison?**

- Go to Dashboard or Comparison page
- Select trading pair (e.g., ETH/USD)
- View price comparison across different protocols

**What is price deviation?**

- Price difference between different protocols
- High deviation may indicate market volatility or oracle issues
- System automatically detects and alerts

**How to set up alerts?**

- Go to Alerts page
- Create new alert rule
- Set price deviation threshold
- Select notification channels (Slack, Telegram, Email)

**How to replay onboarding?**

- Find "Replay Onboarding" button in settings page
- Or use the `OnboardingReset` component

**What languages are supported?**

- Chinese, English
- Switch language in the top right of the page

## Keyboard Shortcuts

| Key   | Function                      |
| ----- | ----------------------------- |
| `?`   | Show keyboard shortcuts help  |
| `Esc` | Close modal/onboarding        |
| `→`   | Next step (in onboarding)     |
| `←`   | Previous step (in onboarding) |

## Getting Help

- Check [Troubleshooting Guide](../TROUBLESHOOTING.md)
- See [API Documentation](./API.md)
- Reference [Error Codes](./ERROR_CODES.md)
