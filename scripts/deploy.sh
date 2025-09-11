#!/bin/bash

set -e

# Configuration
NAMESPACE="lovable-app"
APP_NAME="lovable-app"
IMAGE_TAG=${1:-latest}
ROLLBACK_REVISION=${2:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if connected to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Not connected to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warn "Namespace $NAMESPACE does not exist, creating..."
        kubectl apply -f k8s/namespace.yaml
    fi
    
    log_info "Prerequisites check passed"
}

# Deploy application
deploy() {
    log_info "Starting deployment of $APP_NAME:$IMAGE_TAG"
    
    # Update image tag in deployment
    kubectl set image deployment/$APP_NAME $APP_NAME=ghcr.io/your-org/$APP_NAME:$IMAGE_TAG -n $NAMESPACE
    
    # Apply all configurations
    kubectl apply -f k8s/ -n $NAMESPACE
    
    # Wait for rollout to complete
    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=300s
    
    # Verify deployment
    verify_deployment
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    READY_PODS=$(kubectl get deployment $APP_NAME -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED_PODS=$(kubectl get deployment $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [ "$READY_PODS" = "$DESIRED_PODS" ]; then
        log_info "All pods are ready ($READY_PODS/$DESIRED_PODS)"
    else
        log_error "Not all pods are ready ($READY_PODS/$DESIRED_PODS)"
        kubectl get pods -n $NAMESPACE
        exit 1
    fi
    
    # Health check
    log_info "Performing health check..."
    SERVICE_IP=$(kubectl get service $APP_NAME-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    
    # Port forward for health check
    kubectl port-forward service/$APP_NAME-service 8080:80 -n $NAMESPACE &
    PF_PID=$!
    sleep 5
    
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_info "Health check passed"
    else
        log_error "Health check failed"
        kill $PF_PID
        exit 1
    fi
    
    kill $PF_PID
}

# Rollback deployment
rollback() {
    if [ -z "$ROLLBACK_REVISION" ]; then
        log_info "Rolling back to previous revision..."
        kubectl rollout undo deployment/$APP_NAME -n $NAMESPACE
    else
        log_info "Rolling back to revision $ROLLBACK_REVISION..."
        kubectl rollout undo deployment/$APP_NAME --to-revision=$ROLLBACK_REVISION -n $NAMESPACE
    fi
    
    # Wait for rollback to complete
    kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=300s
    
    # Verify rollback
    verify_deployment
}

# Get deployment status
status() {
    log_info "Deployment status for $APP_NAME:"
    kubectl get deployment $APP_NAME -n $NAMESPACE
    echo
    kubectl get pods -n $NAMESPACE -l app=$APP_NAME
    echo
    kubectl get service -n $NAMESPACE
    echo
    kubectl get ingress -n $NAMESPACE
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        check_prerequisites
        deploy
        log_info "Deployment completed successfully!"
        ;;
    "rollback")
        check_prerequisites
        rollback
        log_info "Rollback completed successfully!"
        ;;
    "status")
        status
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status} [image_tag] [rollback_revision]"
        echo "  deploy - Deploy the application"
        echo "  rollback - Rollback to previous or specified revision"
        echo "  status - Show deployment status"
        exit 1
        ;;
esac