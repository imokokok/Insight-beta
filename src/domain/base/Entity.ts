/**
 * Domain Base - 领域驱动设计基础类
 *
 * 提供实体、值对象、聚合根、领域事件等基础类型
 */

import { logger } from '@/shared/logger';

/**
 * 实体基类
 * 所有实体共享相同的身份标识
 */
export abstract class Entity<T> {
  protected readonly _id: T;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(id: T) {
    this._id = id;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get id(): T {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (this === entity) {
      return true;
    }
    return this._id === entity._id;
  }
}

/**
 * 值对象基类
 * 值对象是不可变的，没有身份标识
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

/**
 * 领域事件接口
 */
export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

/**
 * 领域事件基类
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly metadata: Record<string, unknown>;

  constructor(aggregateId: string, eventType: string, metadata: Record<string, unknown> = {}) {
    this.eventType = eventType;
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.metadata = metadata;
  }
}

/**
 * 事件处理器接口
 */
export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): () => void;
}

/**
 * 简单内存事件总线实现
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<DomainEventHandler>> = new Map();

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.eventType);
    if (!handlers) return;

    logger.debug(`Event published: ${event.eventType}`, {
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
    });

    const promises = Array.from(handlers).map((handler) =>
      handler.handle(event).catch((error) => {
        logger.error(`Event handler error: ${event.eventType}`, {
          error: error instanceof Error ? error.message : String(error),
          aggregateId: event.aggregateId,
        });
      }),
    );

    await Promise.all(promises);
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as DomainEventHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as DomainEventHandler);
    };
  }
}

/**
 * 聚合根基类
 * 聚合根负责维护聚合内部的一致性边界
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  constructor(id: T) {
    super(id);
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  abstract apply(event: DomainEvent): void;
}

/**
 * 仓储接口
 */
export interface Repository<T, IdType> {
  findById(id: IdType): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: IdType): Promise<boolean>;
  exists(id: IdType): Promise<boolean>;
}

/**
 * 可搜索仓储接口
 */
export interface SearchableRepository<T, IdType, FilterType> extends Repository<T, IdType> {
  findByFilter(filter: FilterType, options?: FindOptions): Promise<T[]>;
  count(filter?: FilterType): Promise<number>;
}

/**
 * 分页选项
 */
export interface FindOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * 领域服务接口
 */
export interface DomainService<T> {
  execute(...args: unknown[]): Promise<T>;
}
