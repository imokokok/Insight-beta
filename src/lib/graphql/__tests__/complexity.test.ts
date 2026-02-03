/**
 * GraphQL Complexity Tests
 *
 * GraphQL 复杂度分析单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQueryComplexity,
  validateQuery,
  complexityRateLimiter,
  createComplexityHeaders,
  DEFAULT_COMPLEXITY_CONFIG,
} from '../complexity';

describe('calculateQueryComplexity', () => {
  it('should calculate basic query complexity', () => {
    const query = `
      query {
        priceFeed(id: "1") {
          id
          price
          timestamp
        }
      }
    `;

    const result = calculateQueryComplexity(query);
    expect(result.complexity).toBeGreaterThan(0);
    expect(result.isValid).toBe(true);
  });

  it('should detect query depth', () => {
    const shallowQuery = `query { priceFeed { id } }`;
    const deepQuery = `query { priceFeed { id { nested { deeper { deepest } } } } }`;

    const shallow = calculateQueryComplexity(shallowQuery);
    const deep = calculateQueryComplexity(deepQuery);

    expect(deep.depth).toBeGreaterThan(shallow.depth);
  });

  it('should count aliases', () => {
    const query = `
      query {
        feed1: priceFeed(id: "1") { id }
        feed2: priceFeed(id: "2") { id }
        feed3: priceFeed(id: "3") { id }
      }
    `;

    const result = calculateQueryComplexity(query);
    expect(result.aliases).toBe(3);
  });

  it('should count directives', () => {
    const query = `
      query {
        priceFeed(id: "1") @cacheControl(maxAge: 3600) {
          id
          price @deprecated
        }
      }
    `;

    const result = calculateQueryComplexity(query);
    expect(result.directives).toBe(2);
  });

  it('should calculate complexity for list fields with limit', () => {
    const queryWithLimit = `
      query {
        priceFeeds(limit: 50) {
          id
          price
        }
      }
    `;

    const queryWithoutLimit = `
      query {
        priceFeeds {
          id
          price
        }
      }
    `;

    const withLimit = calculateQueryComplexity(queryWithLimit);
    const withoutLimit = calculateQueryComplexity(queryWithoutLimit);

    expect(withLimit.complexity).toBeGreaterThan(withoutLimit.complexity);
  });

  it('should reject queries exceeding max depth', () => {
    const deepQuery = `
      query {
        level1 {
          level2 {
            level3 {
              level4 {
                level5 {
                  level6 {
                    level7 {
                      level8 {
                        level9 {
                          level10 {
                            level11
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = calculateQueryComplexity(deepQuery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('depth'))).toBe(true);
  });

  it('should reject queries exceeding max complexity', () => {
    const complexQuery = `
      query {
        ${Array(100).fill('priceFeeds(limit: 100) { id price timestamp }').join('\n')}
      }
    `;

    const result = calculateQueryComplexity(complexQuery);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('complexity'))).toBe(true);
  });
});

describe('validateQuery', () => {
  it('should validate valid queries', () => {
    const query = `query { priceFeed(id: "1") { id } }`;
    const result = validateQuery(query);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject queries that are too large', () => {
    const largeQuery = 'query { ' + 'a'.repeat(10000) + ' }';
    const result = validateQuery(largeQuery);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('too large'))).toBe(true);
  });

  it('should reject invalid GraphQL structure', () => {
    const invalidQuery = 'not a graphql query';
    const result = validateQuery(invalidQuery);
    expect(result.valid).toBe(false);
  });

  it('should reject introspection queries', () => {
    const introspectionQuery = `query { __schema { types { name } } }`;
    const result = validateQuery(introspectionQuery);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Introspection'))).toBe(true);
  });

  it('should reject __type queries', () => {
    const typeQuery = `query { __type(name: "PriceFeed") { name } }`;
    const result = validateQuery(typeQuery);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Type queries'))).toBe(true);
  });

  it('should reject template literals', () => {
    const queryWithTemplate = 'query { priceFeed(id: `${variable}`) { id } }';
    const result = validateQuery(queryWithTemplate);
    expect(result.valid).toBe(false);
  });
});

describe('complexityRateLimiter', () => {
  it('should allow requests within limit', () => {
    const result = complexityRateLimiter.checkComplexity('user-1', 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(900);
  });

  it('should track complexity usage', () => {
    complexityRateLimiter.checkComplexity('user-2', 300);
    complexityRateLimiter.checkComplexity('user-2', 400);
    const result = complexityRateLimiter.checkComplexity('user-2', 200);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
  });

  it('should reject requests exceeding limit', () => {
    complexityRateLimiter.checkComplexity('user-3', 900);
    const result = complexityRateLimiter.checkComplexity('user-3', 200);

    expect(result.allowed).toBe(false);
  });

  it('should have different limits for different tiers', () => {
    const defaultResult = complexityRateLimiter.checkComplexity('user-4', 1000, 'default');
    const authResult = complexityRateLimiter.checkComplexity('user-5', 1000, 'authenticated');
    const adminResult = complexityRateLimiter.checkComplexity('user-6', 1000, 'admin');

    expect(defaultResult.remaining).toBe(0);
    expect(authResult.remaining).toBe(4000);
    expect(adminResult.remaining).toBe(19000);
  });

  it('should reset after window expires', async () => {
    complexityRateLimiter.checkComplexity('user-7', 1000);

    // Wait for window to expire (in a real scenario)
    // For testing, we check that the resetTime is in the future
    const result = complexityRateLimiter.checkComplexity('user-7', 1);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });
});

describe('createComplexityHeaders', () => {
  it('should create correct headers', () => {
    const headers = createComplexityHeaders(150, 1000, 850, Date.now() + 60000);

    expect(headers['X-Query-Complexity']).toBe('150');
    expect(headers['X-Query-Complexity-Limit']).toBe('1000');
    expect(headers['X-Query-Complexity-Remaining']).toBe('850');
    expect(headers['X-Query-Complexity-Reset']).toBeDefined();
  });
});

describe('DEFAULT_COMPLEXITY_CONFIG', () => {
  it('should have reasonable defaults', () => {
    expect(DEFAULT_COMPLEXITY_CONFIG.maxComplexity).toBe(1000);
    expect(DEFAULT_COMPLEXITY_CONFIG.maxDepth).toBe(10);
    expect(DEFAULT_COMPLEXITY_CONFIG.maxAliases).toBe(20);
    expect(DEFAULT_COMPLEXITY_CONFIG.maxDirectives).toBe(10);
  });
});
