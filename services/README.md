# Microservices Architecture

This directory contains the microservices architecture for the Oracle Monitor platform.

## Services

### Protocol Sync Services

Each protocol has its own independent service:

- `chainlink-service/` - Chainlink price feed synchronization
- `pyth-service/` - Pyth Network synchronization
- `band-service/` - Band Protocol synchronization
- `api3-service/` - API3 synchronization
- `redstone-service/` - RedStone synchronization
- `switchboard-service/` - Switchboard synchronization
- `flux-service/` - Flux synchronization
- `dia-service/` - DIA synchronization

### Shared Infrastructure

- `shared/` - Common utilities, types, and configurations
- `docker-compose.services.yml` - Docker Compose for all services

## Architecture Benefits

1. **Independent Scaling** - Each service can be scaled independently
2. **Fault Isolation** - Failure in one service doesn't affect others
3. **Technology Diversity** - Different services can use different tech stacks
4. **Team Autonomy** - Teams can work on services independently
5. **Easier Deployment** - Services can be deployed independently

## Communication

Services communicate via:

- **Message Queue** - Redis Pub/Sub for async events
- **gRPC** - For inter-service synchronous communication
- **REST API** - For external communication

## Getting Started

```bash
# Start all services
docker-compose -f docker-compose.services.yml up -d

# Start specific service
docker-compose -f docker-compose.services.yml up chainlink-service -d
```
