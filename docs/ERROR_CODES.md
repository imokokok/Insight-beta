# Error Codes Documentation

This document describes all error codes used in the Insight platform to help developers understand and handle API errors.

## Error Response Format

All API errors follow a unified response format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "category": "ERROR_CATEGORY",
    "details": {
      // Additional error context
    }
  }
}
```

## Error Categories

| Category         | Description            | HTTP Status Range |
| ---------------- | ---------------------- | ----------------- |
| `VALIDATION`     | Input validation error | 400               |
| `AUTHENTICATION` | Authentication error   | 401               |
| `AUTHORIZATION`  | Authorization error    | 403               |
| `NOT_FOUND`      | Resource not found     | 404               |
| `CONFLICT`       | Resource conflict      | 409               |
| `RATE_LIMIT`     | Rate limit exceeded    | 429               |
| `INTERNAL`       | Internal server error  | 500               |
| `EXTERNAL`       | External service error | 502               |
| `TIMEOUT`        | Request timeout        | 504               |
| `UNAVAILABLE`    | Service unavailable    | 503               |

## Common Error Codes

### 400 Bad Request

| Error Code               | Description                         | Scenario                                |
| ------------------------ | ----------------------------------- | --------------------------------------- |
| `VALIDATION_ERROR`       | Request parameter validation failed | Missing required fields, format errors  |
| `INVALID_JSON`           | Request body JSON format error      | Request body parsing failed             |
| `INVALID_PARAMETER`      | Invalid parameter value             | Parameter out of range, type mismatch   |
| `MISSING_REQUIRED_FIELD` | Missing required field              | Required field is empty or not provided |

### 401 Unauthorized

| Error Code             | Description                  | Scenario                                |
| ---------------------- | ---------------------------- | --------------------------------------- |
| `AUTHENTICATION_ERROR` | Authentication failed        | Token invalid or expired                |
| `MISSING_TOKEN`        | Missing authentication token | No Authorization header provided        |
| `INVALID_TOKEN`        | Invalid token format         | Token format doesn't match JWT standard |
| `TOKEN_EXPIRED`        | Token expired                | Need to re-login for new token          |

### 403 Forbidden

| Error Code                 | Description              | Scenario                                                 |
| -------------------------- | ------------------------ | -------------------------------------------------------- |
| `AUTHORIZATION_ERROR`      | Insufficient permissions | User doesn't have permission to access resource          |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions | Higher permission level required                         |
| `RESOURCE_ACCESS_DENIED`   | Resource access denied   | User doesn't have permission to access specific resource |

### 404 Not Found

| Error Code           | Description              | Scenario                           |
| -------------------- | ------------------------ | ---------------------------------- |
| `NOT_FOUND`          | Resource doesn't exist   | Requested resource not found       |
| `FEED_NOT_FOUND`     | Price feed doesn't exist | Specified price feed ID is invalid |
| `PROTOCOL_NOT_FOUND` | Protocol doesn't exist   | Specified protocol name is invalid |
| `USER_NOT_FOUND`     | User doesn't exist       | Specified user ID is invalid       |
| `CONFIG_NOT_FOUND`   | Config doesn't exist     | Specified config not found         |

### 409 Conflict

| Error Code                | Description             | Scenario                                  |
| ------------------------- | ----------------------- | ----------------------------------------- |
| `CONFLICT`                | Resource conflict       | Resource already exists or state conflict |
| `DUPLICATE_RESOURCE`      | Duplicate resource      | Attempting to create existing resource    |
| `RESOURCE_ALREADY_EXISTS` | Resource already exists | Unique constraint conflict                |

### 429 Too Many Requests

| Error Code            | Description           | Scenario                     |
| --------------------- | --------------------- | ---------------------------- |
| `RATE_LIMIT_EXCEEDED` | Request rate exceeded | API rate limit exceeded      |
| `QUOTA_EXCEEDED`      | Quota exhausted       | Daily/monthly quota exceeded |

### 500 Internal Server Error

| Error Code       | Description           | Scenario                  |
| ---------------- | --------------------- | ------------------------- |
| `INTERNAL_ERROR` | Internal server error | Unexpected server error   |
| `DATABASE_ERROR` | Database error        | Database operation failed |
| `CACHE_ERROR`    | Cache error           | Cache operation failed    |

### 502 Bad Gateway

| Error Code               | Description                 | Scenario                                  |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `EXTERNAL_SERVICE_ERROR` | External service error      | Dependent external service returned error |
| `ORACLE_ERROR`           | Oracle service error        | Oracle protocol interface error           |
| `BLOCKCHAIN_ERROR`       | Blockchain connection error | Unable to connect to blockchain node      |

### 503 Service Unavailable

| Error Code            | Description              | Scenario                        |
| --------------------- | ------------------------ | ------------------------------- |
| `SERVICE_UNAVAILABLE` | Service unavailable      | Service temporarily unavailable |
| `MAINTENANCE_MODE`    | System under maintenance | Platform is under maintenance   |

### 504 Gateway Timeout

| Error Code           | Description              | Scenario                         |
| -------------------- | ------------------------ | -------------------------------- |
| `TIMEOUT`            | Request timeout          | Operation timed out              |
| `BLOCKCHAIN_TIMEOUT` | Blockchain query timeout | Blockchain node response timeout |

## Business-Specific Error Codes

### Oracle Related

| Error Code                    | HTTP Status | Description                        |
| ----------------------------- | ----------- | ---------------------------------- |
| `ORACLE_FEED_STALE`           | 400         | Price feed data is stale           |
| `ORACLE_FEED_UNAVAILABLE`     | 503         | Price feed temporarily unavailable |
| `ORACLE_PRICE_DEVIATION`      | 400         | Price deviation exceeds threshold  |
| `ORACLE_UNSUPPORTED_CHAIN`    | 400         | Unsupported blockchain network     |
| `ORACLE_UNSUPPORTED_PROTOCOL` | 400         | Unsupported oracle protocol        |
| `ORACLE_CONTRACT_ERROR`       | 502         | Smart contract call failed         |

### Assertion Related

| Error Code                   | HTTP Status | Description                |
| ---------------------------- | ----------- | -------------------------- |
| `ASSERTION_NOT_FOUND`        | 404         | Assertion doesn't exist    |
| `ASSERTION_EXPIRED`          | 400         | Assertion has expired      |
| `ASSERTION_ALREADY_DISPUTED` | 409         | Assertion already disputed |
| `ASSERTION_INVALID_STATE`    | 400         | Assertion state is invalid |
| `BOND_INSUFFICIENT`          | 400         | Insufficient bond          |

### Dispute Related

| Error Code               | HTTP Status | Description               |
| ------------------------ | ----------- | ------------------------- |
| `DISPUTE_NOT_FOUND`      | 404         | Dispute doesn't exist     |
| `DISPUTE_WINDOW_CLOSED`  | 400         | Dispute window has closed |
| `DISPUTE_ALREADY_EXISTS` | 409         | Dispute already exists    |
| `DISPUTE_INVALID_VOTE`   | 400         | Vote is invalid           |

### Config Related

| Error Code                | HTTP Status | Description              |
| ------------------------- | ----------- | ------------------------ |
| `CONFIG_VALIDATION_ERROR` | 400         | Config validation failed |
| `CONFIG_NOT_FOUND`        | 404         | Config doesn't exist     |
| `CONFIG_VERSION_CONFLICT` | 409         | Config version conflict  |
| `CONFIG_ROLLBACK_FAILED`  | 500         | Config rollback failed   |

### Monitoring Related

| Error Code                   | HTTP Status | Description                 |
| ---------------------------- | ----------- | --------------------------- |
| `ALERT_NOT_FOUND`            | 404         | Alert doesn't exist         |
| `ALERT_ALREADY_ACKNOWLEDGED` | 409         | Alert already acknowledged  |
| `MONITOR_CONFIG_INVALID`     | 400         | Monitor config is invalid   |
| `NOTIFICATION_FAILED`        | 502         | Notification sending failed |

## Error Handling Best Practices

### Frontend Handling

```typescript
import { fetchApiData } from '@/lib/utils';
import { AppError } from '@/lib/errors/AppError';

async function handleApiCall() {
  try {
    const data = await fetchApiData('/api/oracle/feeds');
    return data;
  } catch (error) {
    if (error instanceof AppError) {
      switch (error.code) {
        case 'NOT_FOUND':
          showNotification('error', 'Requested resource not found');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          showNotification('warning', 'Too many requests, please try again later');
          break;
        case 'AUTHENTICATION_ERROR':
          redirectToLogin();
          break;
        default:
          showNotification('error', error.message);
      }
    } else {
      showNotification('error', 'An unknown error occurred, please try again later');
    }
  }
}
```

### Retry Strategy

For retryable errors, use exponential backoff:

```typescript
async function fetchWithRetry<T>(url: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchApiData<T>(url, options);
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AppError) {
        const retryableCodes = [
          'TIMEOUT',
          'EXTERNAL_SERVICE_ERROR',
          'ORACLE_ERROR',
          'SERVICE_UNAVAILABLE',
        ];

        if (!retryableCodes.includes(error.code)) {
          throw error;
        }
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Error Logging

The system automatically logs all errors with the following information:

- Error code and error message
- Error category and HTTP status code
- Request ID (for tracking)
- Timestamp
- Stack trace (development environment)
- Request context (URL, method, parameters)

## Getting Help

If you encounter unrecorded error codes or need more help:

1. See [API Documentation](./API.md)
2. See [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Contact technical support: api@insight.foresight.build
