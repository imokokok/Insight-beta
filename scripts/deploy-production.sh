#!/bin/bash

# Production Deployment Script for Insight Oracle Monitor
# Usage: ./scripts/deploy-production.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found"
        log_info "Please copy .env.production.example to .env.production and configure it"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Generate SSL certificates (self-signed for testing)
generate_ssl_certs() {
    if [ ! -d "ssl" ]; then
        log_info "Creating SSL directory..."
        mkdir -p ssl
    fi
    
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        log_warn "SSL certificates not found, generating self-signed certificates..."
        log_warn "For production, please use proper SSL certificates from Let's Encrypt or your provider"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log_info "Self-signed certificates generated"
    fi
}

# Validate environment variables
validate_env() {
    log_info "Validating environment variables..."
    
    # Source the environment file
    set -a
    source .env.production
    set +a
    
    # Check required variables
    required_vars=(
        "DATABASE_URL"
        "INSIGHT_ADMIN_TOKEN_SALT"
        "INSIGHT_CRON_SECRET"
        "INSIGHT_RPC_URL"
        "INSIGHT_ORACLE_ADDRESS"
        "INSIGHT_CONFIG_ENCRYPTION_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate encryption key length
    key_length=${#INSIGHT_CONFIG_ENCRYPTION_KEY}
    if [ $key_length -lt 32 ]; then
        log_error "INSIGHT_CONFIG_ENCRYPTION_KEY must be at least 32 characters (current: $key_length)"
        exit 1
    fi
    
    # Validate admin token salt length
    salt_length=${#INSIGHT_ADMIN_TOKEN_SALT}
    if [ $salt_length -lt 32 ]; then
        log_error "INSIGHT_ADMIN_TOKEN_SALT must be at least 32 characters (current: $salt_length)"
        exit 1
    fi
    
    log_info "Environment validation passed"
}

# Build and deploy
build_and_deploy() {
    log_info "Building and deploying..."
    
    # Pull latest images
    docker-compose -f $COMPOSE_FILE pull
    
    # Build the application
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down
    
    # Start services
    log_info "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
        log_error "Some services are unhealthy"
        docker-compose -f $COMPOSE_FILE logs
        exit 1
    fi
    
    log_info "Deployment successful!"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # The application automatically applies migrations on startup
    # This is handled by the Next.js application
    log_info "Migrations will be applied automatically on application startup"
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for application to be ready
    sleep 5
    
    # Check health endpoint
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        log_info "Health check passed"
    else
        log_warn "Health check failed, but deployment continues"
        log_warn "Please check the logs: docker-compose logs -f app"
    fi
}

# Display status
display_status() {
    log_info "Deployment Status:"
    docker-compose -f $COMPOSE_FILE ps
    
    log_info ""
    log_info "Useful commands:"
    log_info "  View logs: docker-compose logs -f app"
    log_info "  View worker logs: docker-compose logs -f worker"
    log_info "  Restart app: docker-compose restart app"
    log_info "  Scale workers: docker-compose up -d --scale worker=3"
    log_info ""
    log_info "Application should be accessible at:"
    log_info "  HTTP:  http://localhost"
    log_info "  HTTPS: https://localhost (if SSL is configured)"
}

# Main deployment flow
main() {
    log_info "Starting deployment to $ENVIRONMENT environment..."
    
    check_prerequisites
    generate_ssl_certs
    validate_env
    build_and_deploy
    run_migrations
    cleanup
    health_check
    display_status
    
    log_info "Deployment completed successfully!"
}

# Run main function
main
