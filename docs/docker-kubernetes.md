# Docker and Kubernetes

This document explains how Docker and Kubernetes are used in this project.

The project containerizes four Java Spring Boot microservices and deploys them to Amazon EKS using Kubernetes manifests.

Services included:

```text
naming-server
api-gateway
currency-exchange-service
currency-conversion-service
```

Zipkin is also deployed for distributed tracing.

---

## Docker Overview

Each microservice has its own Dockerfile:

```text
naming-server/Dockerfile
api-gateway/Dockerfile
currency-exchange-service/Dockerfile
currency-conversion-service/Dockerfile
```

Each Dockerfile uses a multi-stage build.

Basic Docker flow:

```text
Build the Spring Boot JAR with Maven
  ↓
Copy the JAR into a Java 17 runtime image
  ↓
Run the service with java -jar
```

This keeps the final image smaller and separates the build environment from the runtime environment.

---

## Docker Runtime Design

Each service runs inside a Java 17 container image.

The containers run as a non-root user:

```text
appuser
UID 10001
GID 10001
```

Service ports:

```text
naming-server: 8761
api-gateway: 8765
currency-exchange-service: 8000
currency-conversion-service: 8100
```

The containers use JVM memory settings such as:

```bash
java -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -jar app.jar
```

This helps the JVM work better with container memory limits.

---

## Docker Images and Amazon ECR

Docker images are built in GitHub Actions Workflow B.

Workflow B builds images for changed services and pushes them to Amazon ECR.

Images are tagged with:

```text
latest
sha-<short-commit-sha>
```

Example:

```text
api-gateway:latest
api-gateway:sha-a1b2c3d
```

The SHA tag is used during deployment so Kubernetes runs the exact image created by the CI/CD pipeline.

---

## Kubernetes Overview

Kubernetes manifests are stored in the `k8s/` folder.

Main folders:

```text
k8s/common
k8s/naming-server
k8s/api-gateway
k8s/currency-exchange-service
k8s/currency-conversion-service
k8s/zipkin
k8s/ingress
```

Most service folders include:

```text
deployment.yaml
service.yaml
kustomization.yaml
```

The main application services also include:

```text
hpa.yaml
pdb.yaml
```

Kustomize is used to apply related Kubernetes resources together.

---

## Namespace

All application resources run inside one namespace:

```text
currency-system
```

The namespace keeps project resources grouped and easier to manage.

---

## Deployments and Services

Each microservice has a Kubernetes Deployment and Service.

The Deployment defines:

```text
Replicas
Container image
Container port
Environment variables
Resource requests and limits
Health probes
Security context
```

The services use `ClusterIP`, so they are reachable inside the Kubernetes cluster.

Service ports:

```text
naming-server: 8761
api-gateway: 8765
currency-exchange-service: 8000
currency-conversion-service: 8100
zipkin: 9411
```

The API Gateway is the main application entry point. The backend microservices stay internal.

---

## API Gateway and Ingress

External traffic enters through Kubernetes Ingress.

Ingress file:

```text
k8s/ingress/ingress.yaml
```

The ingress uses the AWS Load Balancer Controller with:

```text
ingressClassName: alb
```

Main ALB settings:

```text
Internet-facing load balancer
IP target type
HTTP listener on port 80
Health check path: /actuator/health
```

Traffic flow:

```text
Internet
  ↓
AWS Application Load Balancer
  ↓
Kubernetes Ingress
  ↓
API Gateway Service
  ↓
Backend microservices
```

The ingress sends traffic to:

```text
api-gateway:8765
```

The API Gateway then routes requests to the correct backend service.

---

## ConfigMap and Secrets

Common non-sensitive configuration is stored in a Kubernetes ConfigMap.

Examples:

```text
Eureka URL
Zipkin endpoint
Tracing settings
Database host
Database port
Database name
```

Sensitive values are stored in Kubernetes Secrets.

Examples:

```text
Database username
Database password
JWT secret
JWT username
JWT password
JWT expiration value
```

This keeps runtime configuration outside Docker images and avoids hardcoding sensitive values in the source code.

---

## Health Checks and Resources

The Kubernetes Deployments include health probes.

Application services use:

```text
startupProbe
readinessProbe
livenessProbe
```

Most services check:

```text
/actuator/health
```

The services also define CPU and memory requests and limits.

This helps Kubernetes schedule pods correctly and prevents containers from using unlimited resources.

---

## Security Context

The Deployments use container security settings such as:

```text
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
readOnlyRootFilesystem: true
allowPrivilegeEscalation: false
drop all Linux capabilities
seccompProfile: RuntimeDefault
```

A temporary writable `/tmp` volume is mounted with `emptyDir`.

This allows the container to keep a read-only root filesystem while still giving the application a temporary writable directory.

---

## HPA and PDB

The main application services include Horizontal Pod Autoscalers.

HPA configuration:

```text
minReplicas: 2
maxReplicas: 5
CPU target: 70%
```

The main application services also include PodDisruptionBudgets.

Each PDB keeps at least one pod available during voluntary disruptions.

This improves availability during maintenance or node changes.

---

## Zipkin

Zipkin is deployed inside Kubernetes for distributed tracing.

Files:

```text
k8s/zipkin/deployment.yaml
k8s/zipkin/service.yaml
```

Zipkin runs on:

```text
port 9411
```

Microservices send trace data to:

```text
http://zipkin:9411/api/v2/spans
```

This helps trace requests across the API Gateway and backend services.

---

## Amazon EKS

The Kubernetes workloads are designed to run on Amazon EKS.

Terraform creates the EKS cluster and installs the AWS Load Balancer Controller through the EKS add-ons stack.

The AWS Load Balancer Controller watches Kubernetes Ingress resources and creates the AWS Application Load Balancer.

This allows the application to receive external HTTP traffic through AWS.

---

## Deployment Flow

The Docker and Kubernetes deployment flow works like this:

```text
Workflow B builds Docker images
  ↓
Images are pushed to Amazon ECR
  ↓
Workflow B creates deployment metadata
  ↓
Workflow C downloads deployment metadata
  ↓
Workflow C applies Kubernetes manifests
  ↓
Workflow C creates/updates ConfigMap and Secret
  ↓
Workflow C updates Deployment images
  ↓
Kubernetes pulls images from ECR
  ↓
Kubernetes rolls out the new pods
```

Workflow C uses this custom action:

```text
.github/actions/deploy-to-eks
```

This action handles Kubernetes deployment logic and rollout checks.

---

## Summary

Docker packages each Spring Boot microservice into a portable container image.

Kubernetes runs those containers on Amazon EKS.

The strongest Docker and Kubernetes parts of the project are:

```text
Multi-stage Docker builds
Java 17 runtime containers
Non-root container users
Amazon ECR image storage
Kubernetes namespace separation
Deployments and ClusterIP services
ConfigMap and Secret based runtime configuration
Health probes
Resource requests and limits
Security contexts
HPA autoscaling
PDB availability protection
AWS ALB ingress
Zipkin tracing deployment
EKS-based cloud deployment
```

This setup shows how a Java microservices application can be containerized, deployed, exposed, configured, secured, and monitored using Docker, Kubernetes, and AWS.
