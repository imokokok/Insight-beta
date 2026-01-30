import { OracleError } from '@/lib/errors';

export interface SqlInjectionCheckResult {
  isSafe: boolean;
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const SQL_INJECTION_PATTERNS = {
  critical: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|CREATE|ALTER|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bAND\b.*=.*\bAND\b)/i,
    /(\bWAITFOR\b.*\bDELAY\b)/i,
    /(\bBENCHMARK\b\s*\()/i,
    /(\bSLEEP\b\s*\()/i,
    /(\bPG_SLEEP\b\s*\()/i,
    /(\bDBMS_PIPE\.RECEIVE_MESSAGE\b)/i,
    /(\bSYS\.DBMS_EXPORT_EXTENSION\b)/i,
    /(\bUTL_HTTP\b)/i,
    /(\bUTL_FILE\b)/i,
    /(\bDBMS_SQL\b)/i,
    /(\bDBMS_XMLQUERY\b)/i,
    /(\bDBMS_XMLGEN\b)/i,
    /(\bCTXSYS\b)/i,
    /(\bSYS\.DBMS_CDC_PUBLISH\b)/i,
    /(\bSYS\.DBMS_CDC_SUBSCRIBE\b)/i,
    /(\bSYS\.DBMS_CDC_IPUBLISH\b)/i,
    /(\bSYS\.DBMS_CDC_ISUBSCRIBE\b)/i,
  ],
  high: [
    /(\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
    /(\b(DROP|TRUNCATE)\b)/i,
    /(\bUNION\b)/i,
    /(\bOR\b\s+['"\d]\s*=\s*['"\d])/i,
    /(\bAND\b\s+['"\d]\s*=\s*['"\d])/i,
    /(\bLIKE\b.*['"%])/i,
    /(\bIN\b\s*\([^)]+\))/i,
    /(\bEXISTS\b)/i,
    /(\bCASE\b.*\bWHEN\b)/i,
    /(\bCAST\b\s*\()/i,
    /(\bCONVERT\b\s*\()/i,
    /(\bCHAR\b\s*\()/i,
    /(\bCHR\b\s*\()/i,
    /(\bASCII\b\s*\()/i,
    /(\bHEX\b\s*\()/i,
    /(\bUNHEX\b\s*\()/i,
    /(\bDECODE\b\s*\()/i,
    /(\bENCODE\b\s*\()/i,
    /(\bMD5\b\s*\()/i,
    /(\bSHA1\b\s*\()/i,
  ],
  medium: [
    /(\bWHERE\b)/i,
    /(\bHAVING\b)/i,
    /(\bGROUP\b.*\bBY\b)/i,
    /(\bORDER\b.*\bBY\b)/i,
    /(\bLIMIT\b)/i,
    /(\bOFFSET\b)/i,
    /(\bJOIN\b)/i,
    /(\bINNER\b|\bLEFT\b|\bRIGHT\b|\bFULL\b)/i,
    /(\bON\b.*=)/i,
    /(\bAS\b)/i,
    /(\bDISTINCT\b)/i,
    /(\bCOUNT\b\s*\()/i,
    /(\bSUM\b\s*\()/i,
    /(\bAVG\b\s*\()/i,
    /(\bMIN\b\s*\()/i,
    /(\bMAX\b\s*\()/i,
    /(\bSUBSTRING\b\s*\()/i,
    /(\bSUBSTR\b\s*\()/i,
    /(\bREPLACE\b\s*\()/i,
    /(\bTRIM\b\s*\()/i,
  ],
  low: [
    /[;]/,
    /['"]/,
    /\\/,
    /\|\|/,
    /\+\+/,
    /\bNULL\b/i,
    /\bTRUE\b/i,
    /\bFALSE\b/i,
    /\bIS\s+NULL\b/i,
    /\bIS\s+NOT\s+NULL\b/i,
    /\bBETWEEN\b/i,
  ],
};

const SUSPICIOUS_KEYWORDS = [
  'admin',
  'root',
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'key',
  'api_key',
  'apikey',
  'auth',
  'authentication',
  'session',
  'cookie',
  'csrf',
  'xsrf',
  'xsstoken',
];

export function detectSqlInjection(input: string): SqlInjectionCheckResult {
  const detectedPatterns: string[] = [];
  let maxRiskLevel: SqlInjectionCheckResult['riskLevel'] = 'low';

  for (const [level, patterns] of Object.entries(SQL_INJECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(`${level}: ${pattern.source}`);
        if (level === 'critical') maxRiskLevel = 'critical';
        else if (level === 'high' && maxRiskLevel !== 'critical') maxRiskLevel = 'high';
        else if (level === 'medium' && maxRiskLevel === 'low') maxRiskLevel = 'medium';
      }
    }
  }

  const lowerInput = input.toLowerCase();
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      detectedPatterns.push(`keyword: ${keyword}`);
    }
  }

  return {
    isSafe: detectedPatterns.length === 0,
    detectedPatterns,
    riskLevel: maxRiskLevel,
  };
}

export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/[;]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '')
    .replace(/\b(UNION|INTERSECT|EXCEPT)\b/gi, '')
    .trim();
}

export function validateSqlInput(
  input: string,
  context?: { endpoint?: string; param?: string },
): void {
  const result = detectSqlInjection(input);

  if (!result.isSafe) {
    throw OracleError.validationError(
      `检测到潜在的 SQL 注入攻击: ${result.detectedPatterns.slice(0, 3).join(', ')}`,
      {
        endpoint: context?.endpoint,
        params: {
          param: context?.param,
          input: input.slice(0, 100),
          detectedPatterns: result.detectedPatterns,
        },
      },
    );
  }
}

export function createSqlInjectionMiddleware() {
  return function sqlInjectionMiddleware(
    req: Request,
    next: () => Promise<Response>,
  ): Promise<Response> {
    const url = new URL(req.url);
    const params = url.searchParams;

    for (const [key, value] of params.entries()) {
      try {
        validateSqlInput(value, { endpoint: url.pathname, param: key });
      } catch (error) {
        if (error instanceof OracleError) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                error: error.message,
                code: error.code,
                severity: error.severity,
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          );
        }
        throw error;
      }
    }

    return next();
  };
}

export function safeSqlIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw OracleError.validationError(`无效的 SQL 标识符: ${identifier}`);
  }
  return identifier;
}

export function safeSqlOrderBy(orderBy: string, allowedColumns: string[]): string {
  const sanitized = orderBy.replace(/[^a-zA-Z0-9_\s,]/g, '');
  const columns = sanitized
    .split(',')
    .map((c) => c.trim().split(/\s+/)[0])
    .filter(Boolean);

  for (const col of columns) {
    if (col && !allowedColumns.includes(col)) {
      throw OracleError.validationError(`不允许的排序列: ${col}`);
    }
  }

  return sanitized;
}
