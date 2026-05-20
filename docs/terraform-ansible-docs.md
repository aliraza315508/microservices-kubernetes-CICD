# Infrastructure Automation

This document explains how Terraform and Ansible are used in this project.

Terraform is used to create and manage AWS infrastructure.

Ansible is used to validate the project structure, infrastructure, Kubernetes deployment, and application health.

The goal is simple:

```text
Terraform creates.
Ansible validates.
```

---

## Terraform Overview

Terraform code is organized into separate stacks:

```text
terraform/state-management
terraform/vpc
terraform/database
terraform/eks
terraform/eks-add-ons
terraform/workflow-b
```

Each stack has one clear responsibility.

**state-management:** creates the S3 bucket and DynamoDB table for Terraform remote state;

**vpc:** creates the VPC, public subnets, private subnets, internet gateway, NAT gateway, route tables, and security group;

**database:** creates the private Amazon RDS PostgreSQL database;

**eks:** creates the Amazon EKS cluster, node group, IAM roles, and OIDC provider;

**eks-add-ons:** installs the AWS Load Balancer Controller using Helm and IRSA;

**workflow-b:** creates ECR repositories and IAM roles used by GitHub Actions workflows;

---

## Terraform Remote State

Terraform uses remote state to store infrastructure state safely.

The backend uses:

```text
Amazon S3
  → stores Terraform state files

Amazon DynamoDB
  → provides state locking
```

The `state-management` stack creates these backend resources.

Other Terraform stacks store their state in S3 using separate state files.

Example:

```text
vpc/terraform.tfstate
database/terraform.tfstate
eks/terraform.tfstate
eks-add-ons/terraform.tfstate
workflow-b/terraform.tfstate
```

This keeps infrastructure state organized and allows stacks to share outputs.

---

## Terraform Stack Order

Terraform stacks are designed to run in this order:

```text
state-management
  ↓
vpc
  ↓
database
  ↓
eks
  ↓
eks-add-ons
  ↓
workflow-b
```

The VPC is created before the database and EKS because both depend on networking.

The EKS add-ons stack runs after the EKS cluster exists.

The workflow-b stack creates ECR repositories and GitHub Actions IAM roles after the main infrastructure is ready.

---

## AWS Infrastructure Created by Terraform

Terraform creates the main AWS platform for this project:

```text
S3 bucket for Terraform state
DynamoDB table for state locking
VPC
Public and private subnets
Internet Gateway
NAT Gateway
Route tables
Security groups
Private RDS PostgreSQL database
EKS cluster
EKS managed node group
EKS OIDC provider
AWS Load Balancer Controller
ECR repositories
GitHub Actions IAM roles
```

This infrastructure supports the full microservices deployment on Amazon EKS.

---

## Terraform GitHub Actions Automation

Terraform is automated through:

```text
.github/workflows/infrastructure-creation-workflow.yml
```

This workflow can run:

```text
terraform fmt
terraform init
terraform validate
terraform plan
terraform apply
```

It uses this custom local action:

```text
.github/actions/run-terraform-infrastructure
```

The custom action handles stack selection, changed-file detection, and Terraform command execution.

This keeps Terraform automation clean and avoids writing long scripts inside the workflow YAML.

---

## Ansible Overview

Ansible files are stored under:

```text
ansible/
```

Main Ansible files:

```text
ansible/inventory/local.ini
ansible/group_vars/local.yml
ansible/playbooks/
```

The playbooks run against the local machine or GitHub Actions runner.

Ansible is not used to create AWS infrastructure in this project.

Terraform creates the infrastructure.

Ansible validates that the infrastructure and deployed application are working correctly.

---

## Ansible Preflight Validation

Preflight validation runs before the main build and deployment process.

Workflow file:

```text
.github/workflows/pre-validation-ansible.yml
```

Main playbooks:

```text
00-project-structure-validation.yml
01-terraform-validation.yml
02-docker-validation.yml
03-kubernetes-manifest-validation.yml
04-github-actions-validation.yml
```

These playbooks check that the project is ready for deployment.

They validate:

```text
Required folders and files
Terraform stack structure
Terraform formatting
Terraform validation
Dockerfiles
Kubernetes manifests
GitHub workflow files
```

This catches basic project and configuration issues early.

---

## Ansible Post-Deployment Validation

Post-deployment validation runs after the EKS deployment workflow succeeds.

Workflow file:

```text
.github/workflows/ansible-post-deployment-validation.yaml
```

Main playbooks:

```text
05-aws-infrastructure-verification.yml
06-kubernetes-health-check.yml
07-jwt-api-gateway-smoke-test.yml
08-microservices-endpoint-smoke-test.yml
09-zipkin-validation.yml
```

These playbooks verify the deployed system.

They check:

```text
AWS infrastructure exists
EKS cluster is available
ECR repositories exist
RDS database exists
Kubernetes deployments are healthy
Kubernetes services have endpoints
Ingress has an ALB hostname
JWT authentication works
Microservice endpoints respond correctly
Zipkin is reachable
```

This confirms that the system is deployed and usable.

---

## Why Terraform and Ansible Are Both Used

Terraform and Ansible have different responsibilities.

**Terraform:** provisions AWS infrastructure;

**Ansible:** validates infrastructure and application health;

Terraform is best for creating resources such as VPC, EKS, RDS, ECR, IAM, S3, and DynamoDB.

Ansible is useful for running checks, smoke tests, and operational validation after the infrastructure and application are deployed.

This gives the project both infrastructure automation and environment verification.

---

## Summary

Terraform creates the AWS infrastructure.

Ansible validates the project, infrastructure, Kubernetes deployment, and application behavior.

Strong parts of this design include:

```text
Separated Terraform stacks
S3 remote state
DynamoDB state locking
VPC and private networking
Private RDS PostgreSQL database
Amazon EKS cluster
AWS Load Balancer Controller
ECR repositories
GitHub Actions IAM roles
Terraform automation workflow
Ansible preflight validation
Ansible post-deployment validation
```

This shows a production-style infrastructure automation approach for a Java microservices application running on AWS and Kubernetes.
