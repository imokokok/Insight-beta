/**
 * Safe Expression Evaluator
 *
 * 安全的表达式评估器，替代 new Function()
 * 支持基本的数学运算、比较和逻辑运算
 */

import { logger } from '@/lib/logger';

export interface EvaluatorContext {
  [key: string]: unknown;
}

export class SafeExpressionEvaluator {
  private static readonly MAX_EXPRESSION_LENGTH = 500;
  private static readonly MAX_TOKENS = 100;

  // 危险模式黑名单
  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /require\s*\(/i,
    /import\s*\(/i,
    /process/i,
    /global/i,
    /window/i,
    /document/i,
    /fetch\s*\(/i,
    /XMLHttpRequest/i,
    /WebSocket/i,
    /setTimeout/i,
    /setInterval/i,
    /while\s*\(/i,
    /for\s*\(/i,
    /function/i,
    /=>/i,
    /class/i,
    /new\s+/i,
  ];

  // 允许的运算符
  private static readonly OPERATORS: Record<string, (a: number, b: number) => number> = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => (b !== 0 ? a / b : NaN),
    '%': (a, b) => a % b,
    '**': (a, b) => Math.pow(a, b),
  };

  // 比较运算符
  private static readonly COMPARISON_OPS: Record<string, (a: unknown, b: unknown) => boolean> = {
    '==': (a, b) => a == b,
    '!=': (a, b) => a != b,
    '===': (a, b) => a === b,
    '!==': (a, b) => a !== b,
    '<': (a, b) => (a as number) < (b as number),
    '>': (a, b) => (a as number) > (b as number),
    '<=': (a, b) => (a as number) <= (b as number),
    '>=': (a, b) => (a as number) >= (b as number),
  };

  // 逻辑运算符
  private static readonly LOGICAL_OPS: Record<string, (a: boolean, b: boolean) => boolean> = {
    '&&': (a, b) => a && b,
    '||': (a, b) => a || b,
  };

  // 数学函数白名单
  private static readonly MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    abs: Math.abs,
    max: Math.max,
    min: Math.min,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    pow: Math.pow,
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    exp: Math.exp,
  };

  // 常量
  private static readonly CONSTANTS: Record<string, number> = {
    PI: Math.PI,
    E: Math.E,
  };

  /**
   * 评估表达式
   */
  static evaluate(expression: string, context: EvaluatorContext = {}): boolean {
    try {
      // 1. 长度检查
      if (expression.length > this.MAX_EXPRESSION_LENGTH) {
        logger.warn('Expression too long', {
          length: expression.length,
          max: this.MAX_EXPRESSION_LENGTH,
        });
        return false;
      }

      // 2. 危险模式检查
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(expression)) {
          logger.warn('Expression contains dangerous pattern', {
            expression,
            pattern: pattern.source,
          });
          return false;
        }
      }

      // 3. 解析并评估表达式
      const tokens = this.tokenize(expression);
      if (tokens.length > this.MAX_TOKENS) {
        logger.warn('Expression too complex', {
          tokens: tokens.length,
          max: this.MAX_TOKENS,
        });
        return false;
      }

      const result = this.parseExpression(tokens, context);
      return Boolean(result);
    } catch (error) {
      logger.error('Expression evaluation failed', {
        error: error instanceof Error ? error.message : String(error),
        expression: expression.substring(0, 100),
      });
      return false;
    }
  }

  /**
   * 词法分析 - 将表达式拆分为 token
   */
  private static tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';

    for (let i = 0; i < expression.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const char: string = expression[i]!;

      // 跳过空白字符
      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      // 多字符运算符
      if (char === '&' && expression[i + 1] === '&') {
        if (current) tokens.push(current);
        tokens.push('&&');
        current = '';
        i++;
        continue;
      }

      if (char === '|' && expression[i + 1] === '|') {
        if (current) tokens.push(current);
        tokens.push('||');
        current = '';
        i++;
        continue;
      }

      if (char === '=' && expression[i + 1] === '=') {
        if (current) tokens.push(current);
        tokens.push(expression[i + 2] === '=' ? '===' : '==');
        current = '';
        i += expression[i + 2] === '=' ? 2 : 1;
        continue;
      }

      if (char === '!' && expression[i + 1] === '=') {
        if (current) tokens.push(current);
        tokens.push(expression[i + 2] === '=' ? '!==' : '!=');
        current = '';
        i += expression[i + 2] === '=' ? 2 : 1;
        continue;
      }

      // 单字符运算符
      // eslint-disable-next-line no-useless-escape
      if (/[+\-*/%<>()\[\],!]/.test(char)) {
        if (current) tokens.push(current);
        tokens.push(char);
        current = '';
        continue;
      }

      // 数字
      if (/[\d.]/.test(char)) {
        current += char;
        continue;
      }

      // 标识符（变量名、函数名）
      if (/[a-zA-Z_]/.test(char)) {
        current += char;
        continue;
      }

      // 其他字符（可能是变量名的一部分）
      if (current && /[a-zA-Z0-9_]/.test(char)) {
        current += char;
        continue;
      }

      // 不支持的字符
      throw new Error(`Invalid character: ${char}`);
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * 解析并评估表达式
   */
  private static parseExpression(tokens: string[], context: EvaluatorContext): unknown {
    // 处理逻辑运算符 (||, &&)
    for (let i = tokens.length - 1; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = tokens[i]!;
      if (token === '||' || token === '&&') {
        const left = this.parseExpression(tokens.slice(0, i), context);
        const right = this.parseExpression(tokens.slice(i + 1), context);
        const op = this.LOGICAL_OPS[token];
        if (op) {
          return op(Boolean(left), Boolean(right));
        }
      }
    }

    // 处理比较运算符
    for (let i = tokens.length - 1; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = tokens[i]!;
      const op = this.COMPARISON_OPS[token];
      if (op) {
        const left = this.parseExpression(tokens.slice(0, i), context);
        const right = this.parseExpression(tokens.slice(i + 1), context);
        return op(left, right);
      }
    }

    // 处理加减法
    for (let i = 0; i < tokens.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = tokens[i]!;
      if (token === '+' || token === '-') {
        const left = this.parseExpression(tokens.slice(0, i), context);
        const right = this.parseExpression(tokens.slice(i + 1), context);
        const op = this.OPERATORS[token];
        if (op) {
          return op(Number(left), Number(right));
        }
      }
    }

    // 处理乘除法
    for (let i = 0; i < tokens.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = tokens[i]!;
      if (token === '*' || token === '/' || token === '%') {
        const left = this.parseExpression(tokens.slice(0, i), context);
        const right = this.parseExpression(tokens.slice(i + 1), context);
        const op = this.OPERATORS[token];
        if (op) {
          return op(Number(left), Number(right));
        }
      }
    }

    // 处理括号
    if (tokens[0] === '(' && tokens[tokens.length - 1] === ')') {
      return this.parseExpression(tokens.slice(1, -1), context);
    }

    // 处理函数调用
    if (tokens.length >= 3 && tokens[1] === '(' && tokens[tokens.length - 1] === ')') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const funcName = tokens[0]!;
      if (!this.MATH_FUNCTIONS[funcName]) {
        throw new Error(`Unknown function: ${funcName}`);
      }
      const args = this.parseArguments(tokens.slice(2, -1), context);
      return this.MATH_FUNCTIONS[funcName](...args);
    }

    // 处理数组访问
    if (tokens.length >= 3 && tokens[1] === '[' && tokens[tokens.length - 1] === ']') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const arrayName = tokens[0]!;
      const index = this.parseExpression(tokens.slice(2, -1), context);
      const array = this.getValue(arrayName, context);
      if (Array.isArray(array)) {
        return array[Number(index)];
      }
      throw new Error(`Not an array: ${arrayName}`);
    }

    // 处理一元运算符
    if (tokens[0] === '!') {
      // eslint-disable-next-line no-extra-boolean-cast
      return !Boolean(this.parseExpression(tokens.slice(1), context));
    }

    if (tokens[0] === '-') {
      return -Number(this.parseExpression(tokens.slice(1), context));
    }

    // 单 token
    if (tokens.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.parseValue(tokens[0]!, context);
    }

    throw new Error(`Invalid expression: ${tokens.join(' ')}`);
  }

  /**
   * 解析函数参数
   */
  private static parseArguments(tokens: string[], context: EvaluatorContext): number[] {
    const args: number[] = [];
    let current: string[] = [];
    let depth = 0;

    for (const token of tokens) {
      // eslint-disable-next-line security/detect-possible-timing-attacks
      if (token === '(') depth++;
      // eslint-disable-next-line security/detect-possible-timing-attacks
      if (token === ')') depth--;

      if (token === ',' && depth === 0) {
        args.push(Number(this.parseExpression(current, context)));
        current = [];
      } else {
        current.push(token);
      }
    }

    if (current.length > 0) {
      args.push(Number(this.parseExpression(current, context)));
    }

    return args;
  }

  /**
   * 解析单个值
   */
  private static parseValue(token: string, context: EvaluatorContext): unknown {
    // 数字
    // eslint-disable-next-line security/detect-unsafe-regex
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      return parseFloat(token);
    }

    // 字符串字面量
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1);
    }

    // 布尔值
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (token === 'true') return true;
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (token === 'false') return false;

    // null/undefined
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (token === 'null') return null;
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (token === 'undefined') return undefined;

    // 常量
    if (Object.prototype.hasOwnProperty.call(this.CONSTANTS, token)) {
      return this.CONSTANTS[token];
    }

    // 变量
    return this.getValue(token, context);
  }

  /**
   * 从上下文中获取值
   */
  private static getValue(name: string, context: EvaluatorContext): unknown {
    if (Object.prototype.hasOwnProperty.call(context, name)) {
      return context[name];
    }
    throw new Error(`Unknown variable: ${name}`);
  }
}
