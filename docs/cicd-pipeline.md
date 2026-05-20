# CI/CD Pipeline

This document explains the CI/CD pipeline used in this project.

The pipeline automates the delivery flow for a Java Spring Boot microservices system:

```text
Code change
  ↓
Java build and test
  ↓
Docker image build
  ↓
Amazon ECR image push
  ↓
Amazon EKS deployment
  ↓
Post-deployment validation
```

The CI/CD system is split into separate GitHub Actions workflows. Each workflow has one clear responsibility.

---

## How the CI/CD Pipeline Is Built

The CI/CD pipeline is built with GitHub Actions workflows and custom local GitHub Actions.

The workflow files define **when** each stage runs.

The custom actions define **how** the complex logic runs.

This keeps the workflow YAML files clean and avoids writing long scripts directly inside the workflows.

Custom actions used:

```text
.github/actions/prepare-build-matrix
.github/actions/prepare-image-metadata
.github/actions/create-deployment-metadata
.github/actions/deploy-to-eks
.github/actions/run-terraform-infrastructure
.github/actions/run-terraform-state-management
```

The project uses custom actions for:

```text
Detecting changed microservices
Preparing Docker image metadata
Creating deployment metadata
Deploying selected services to EKS
Running Terraform infrastructure automation
Managing Terraform state setup
```

Why custom actions are used:

**Cleaner workflows:** workflow YAML files stay simple;

**Reusable logic:** deployment and Terraform logic can be reused;

**Better maintainability:** JavaScript action code is easier to organize than long inline shell scripts;

**Clear responsibility:** each custom action has one specific job;

**Production-style design:** workflows describe the pipeline, while custom actions handle implementation details;

In simple terms:

```text
Workflow YAML files
  → control the pipeline flow

Custom GitHub Actions
  → run the detailed automation logic
```

---

## Workflow Overview

The project uses these main workflows:

```text
.github/workflows/pre-validation-ansible.yml
.github/workflows/workflow-a-ci.yml
.github/workflows/workflow-b-docker-build-push.yml
.github/workflows/workflow-c-deploy-dev.yml
.github/workflows/ansible-post-deployment-validation.yaml
.github/workflows/infrastructure-creation-workflow.yml
```

Main delivery flow:

```text
Workflow 0 - Ansible Preflight Validation
  ↓
Workflow A - Java CI
  ↓
Workflow B - Build and Push Docker Images to Amazon ECR
  ↓
Workflow C - Deploy to Amazon EKS
  ↓
Workflow D - Ansible Post-Deployment Validation
```

Terraform infrastructure is managed separately through the infrastructure workflow.

---

## Workflow 0 - Ansible Preflight Validation

**File:** `.github/workflows/pre-validation-ansible.yml`

This workflow validates the project before the main build and deployment process.

It checks:

**Project structure:** required folders and files exist;

**Terraform configuration:** Terraform formatting and validation pass;

**Docker configuration:** Dockerfiles exist for all services;

**Kubernetes manifests:** required Kubernetes YAML files exist;

**GitHub Actions files:** required workflow files exist;

This acts as a preflight quality gate before deployment work starts.

---

## Workflow A - Java CI

**File:** `.github/workflows/workflow-a-ci.yml`

Workflow A builds and tests all Java microservices.

Services included:

```text
naming-server
api-gateway
currency-exchange-service
currency-conversion-service
```

It uses a matrix strategy so each service is built separately.

Main steps:

```text
Checkout source code
  ↓
Set up Java 17
  ↓
Run Maven build and tests
  ↓
Upload JAR artifacts
  ↓
Upload test reports
```

Main Maven command:

```bash
./mvnw clean verify
```

This verifies that each service compiles, passes tests, and can be packaged successfully.

---

## Workflow B - Build and Push to Amazon ECR

**File:** `.github/workflows/workflow-b-docker-build-push.yml`

Workflow B starts after Workflow A succeeds.

Its job is to build Docker images and push them to Amazon ECR.

Main steps:

```text
Detect changed services
  ↓
Build Docker images
  ↓
Push images to Amazon ECR
  ↓
Create deployment metadata
  ↓
Upload deployment metadata artifact
```

This workflow uses changed-service detection, so it does not always rebuild every service.

The custom action used for this is:

```text
.github/actions/prepare-build-matrix
```

It decides which services need to be rebuilt based on changed files.

---

## Docker Image Tagging

Workflow B tags each Docker image with:

```text
latest
sha-<short-commit-sha>
```

Example:

```text
api-gateway:latest
api-gateway:sha-a1b2c3d
```

The `latest` tag is useful for quick reference.

The `sha-xxxxxxx` tag is used for real deployments because it points to a specific commit.

This makes deployments traceable and repeatable.

---

## Deployment Metadata

Workflow B creates a deployment metadata file using:

```text
.github/actions/create-deployment-metadata
```

The metadata includes:

```text
Commit SHA
Short SHA
Image tag
AWS region
AWS account ID
Services selected for deployment
Kubernetes deployment names
ECR repository names
```

Workflow C downloads this metadata and uses it during deployment.

This is important because Workflow C deploys the exact image tag created by Workflow B.

That prevents build/deploy mismatch.

---

## Workflow C - Deploy to Amazon EKS

**File:** `.github/workflows/workflow-c-deploy-dev.yml`

Workflow C starts after Workflow B succeeds.

Its job is to deploy the selected services to Amazon EKS.

Main steps:

```text
Checkout the correct commit
  ↓
Download deployment metadata
  ↓
Configure AWS credentials
  ↓
Update kubeconfig for EKS
  ↓
Deploy selected services to Kubernetes
  ↓
Check rollout status
```

Workflow C uses this custom local action:

```text
.github/actions/deploy-to-eks
```

This action handles:

```text
Reading deployment metadata
Applying Kubernetes manifests
Creating/updating ConfigMaps
Creating/updating Secrets
Updating deployment images
Checking rollout status
Printing Kubernetes resource summary
```

This keeps Workflow C clean and avoids putting a long deployment script inside the YAML file.

---

## Runtime Configuration

During deployment, Workflow C creates or updates Kubernetes runtime configuration.

The ConfigMap stores non-sensitive values:

```text
Eureka URL
Database host
Database port
Database name
Zipkin endpoint
Tracing configuration
```

The Secret stores sensitive values:

```text
Database username
Database password
JWT secret
JWT username
JWT password
JWT expiration value
```

This keeps application configuration outside the Docker images and avoids hardcoding runtime values in the source code.

---

## Workflow D - Ansible Post-Deployment Validation

**File:** `.github/workflows/ansible-post-deployment-validation.yaml`

Workflow D runs after Workflow C succeeds.

It validates that the deployed system is actually working.

It runs Ansible playbooks for:

```text
AWS infrastructure verification
Kubernetes health checks
JWT/API Gateway smoke test
Microservices endpoint smoke test
Zipkin validation
```

This is useful because a deployment can technically succeed even if the application is not healthy.

Workflow D confirms that the deployed system is usable after rollout.

---

## Terraform Infrastructure Workflow

**File:** `.github/workflows/infrastructure-creation-workflow.yml`

This workflow manages AWS infrastructure with Terraform.

It supports these infrastructure stacks:

```text
vpc
database
eks
eks-add-ons
workflow-b
```

It uses this custom local action:

```text
.github/actions/run-terraform-infrastructure
```

The workflow can run:

```text
terraform fmt
terraform init
terraform validate
terraform plan
terraform apply
```

This keeps infrastructure automation separate from application deployment.

---

## Why This CI/CD Design Is Production-Style

This pipeline is production-style because each stage has a clear purpose.

**Workflow 0:** validates project structure and configuration;

**Workflow A:** verifies Java code;

**Workflow B:** builds and pushes Docker images;

**Workflow C:** deploys the exact built image to EKS;

**Workflow D:** validates the deployed system;

**Terraform workflow:** manages AWS infrastructure separately;

**Custom actions:** keep automation reusable and organized;

**SHA image tags:** connect code commits to deployed containers;

**Deployment metadata:** passes reliable build information between workflows;

This gives the project a complete build, package, deploy, and validate flow.

---

## Summary

The CI/CD pipeline connects Java, Docker, GitHub Actions, Amazon ECR, Amazon EKS, Kubernetes, Terraform, and Ansible into one automated delivery system.

The strongest parts of the design are:

```text
Matrix-based Java CI
Changed-service Docker builds
Amazon ECR image publishing
SHA-based Docker image tags
Deployment metadata artifact
Automated EKS deployment
Runtime ConfigMap and Secret creation
Kubernetes rollout checks
Ansible post-deployment validation
Terraform-managed AWS infrastructure
```

This pipeline demonstrates both backend development and DevOps engineering skills in a real microservices deployment project.
