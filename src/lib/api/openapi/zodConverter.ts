/**
 * Zod Schema 转 OpenAPI Schema 转换器
 */

import { z } from 'zod';

import type { Schema } from './types';

export function zodToOpenAPISchema(zodSchema: z.ZodTypeAny): Schema {
  if (zodSchema instanceof z.ZodOptional) {
    return zodToOpenAPISchema(zodSchema.unwrap());
  }

  if (zodSchema instanceof z.ZodDefault) {
    return zodToOpenAPISchema(zodSchema.removeDefault());
  }

  if (zodSchema instanceof z.ZodString) {
    const schema: Schema = { type: 'string' };
    if ('enumValues' in zodSchema._def && zodSchema._def.enumValues) {
      schema.enum = zodSchema._def.enumValues as string[];
    }
    return schema;
  }

  if (zodSchema instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (zodSchema instanceof z.ZodBigInt) {
    return { type: 'integer' };
  }

  if (zodSchema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (zodSchema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToOpenAPISchema(zodSchema.element),
    };
  }

  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenAPISchema(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (zodSchema instanceof z.ZodUnion) {
    const options = zodSchema._def.options as z.ZodTypeAny[];
    if (options.every((opt) => opt instanceof z.ZodLiteral)) {
      return {
        type: 'string',
        enum: options.map((opt) => (opt as z.ZodLiteral<string>).value),
      };
    }
  }

  if (zodSchema instanceof z.ZodLiteral) {
    return { type: 'string', enum: [zodSchema.value as string] };
  }

  if (zodSchema instanceof z.ZodNullable) {
    return zodToOpenAPISchema(zodSchema.unwrap());
  }

  return { type: 'string' };
}
