# Microservices Kubernetes CI/CD Platform

A production-style Java Spring Boot microservices project containerized with Docker, deployed on Kubernetes/Amazon EKS, automated with GitHub Actions CI/CD, provisioned with Terraform, and validated with Ansible.

This project demonstrates a complete backend + DevOps workflow, including microservice development, API Gateway routing, JWT authentication, Docker image builds, Amazon ECR publishing, Kubernetes deployment, AWS infrastructure automation, distributed tracing, database migration, and post-deployment validation.

---

## Project Summary

This project is a currency conversion microservices system built with Java and Spring Boot.

It contains multiple independently deployable services that communicate through REST APIs and service discovery. The system is designed to run locally during development and in AWS using Amazon EKS for cloud deployment.

The goal of this project is to demonstrate real-world backend engineering and DevOps skills in one complete end-to-end system.

This project includes:

**Backend Services:** Java Spring Boot microservices;  
**Routing:** API Gateway-based routing;  
**Security:** JWT authentication;  
**Service Discovery:** Eureka naming server;  
**Database:** PostgreSQL database integration;  
**Database Migration:** Flyway;  
**Observability:** Zipkin distributed tracing;  
**Containers:** Docker containerization;  
**Kubernetes:** Kubernetes deployment manifests;  
**Cloud Deployment:** Amazon EKS deployment;  
**Image Registry:** Amazon ECR image publishing;  
**Infrastructure:** Terraform infrastructure automation;  
**CI/CD:** GitHub Actions pipelines;  
**Validation:** Ansible validation and smoke testing;

---

## Tech Stack

**Backend:** Java 17, Spring Boot, Spring Web, Spring Data JPA;  
**Microservices:** Spring Cloud Gateway, Eureka Naming Server, REST APIs;  
**Security:** JWT Authentication;  
**Database:** PostgreSQL, Amazon RDS, H2 for local/testing;  
**Database Migration:** Flyway;  
**Observability / Tracing:** Zipkin;  
**Containers:** Docker;  
**Orchestration:** Kubernetes, Amazon EKS;  
**Cloud:** AWS, EKS, ECR, RDS, VPC, IAM, S3, DynamoDB;  
**Infrastructure as Code:** Terraform;  
**Validation / Automation:** Ansible;  
**CI/CD:** GitHub Actions;  
**Build Tool:** Maven;

---

## What This Project Demonstrates

This project demonstrates both backend development and DevOps engineering skills.

### Backend Engineering

**Microservices:** Built multiple Java Spring Boot microservices;  
**REST APIs:** Designed APIs for currency exchange and currency conversion;  
**API Gateway:** Implemented centralized routing through Spring Cloud Gateway;  
**Security:** Added JWT-based authentication;  
**Service Discovery:** Used Eureka for service registration and discovery;  
**Database:** Integrated database persistence with Spring Data JPA;  
**Database Migration:** Used Flyway for database migration/versioning;  
**Observability:** Added Zipkin-based distributed tracing;  
**Error Handling:** Added exception handling and structured API error responses;  
**Testing:** Added unit/integration testing for important service logic;

### DevOps Engineering

**Containers:** Dockerized all microservices;  
**Image Registry:** Built and pushed Docker images to Amazon ECR;  
**Kubernetes:** Deployed services to Kubernetes;  
**Cloud Kubernetes:** Used Amazon EKS as the managed Kubernetes platform;  
**Infrastructure as Code:** Provisioned AWS infrastructure with Terraform;  
**CI/CD:** Used GitHub Actions for automated build, test, image push, and deployment;  
**Cloud Authentication:** Used OIDC-based AWS authentication from GitHub Actions;  
**Validation:** Used Ansible for validation, health checks, and smoke testing;  
**Project Organization:** Separated application code, infrastructure code, Kubernetes manifests, and automation logic;

---

## Microservices Architecture

The system contains four main services:

**naming-server:** Eureka service discovery server used by microservices to register and discover each other; **Port:** 8761;  

**api-gateway:** Central entry point for client requests, route forwarding, and JWT security; **Port:** 8765;  

**currency-exchange-service:** Provides exchange rate data for currency pairs; **Port:** 8000;  

**currency-conversion-service:** Calculates converted currency values by calling the exchange service; **Port:** 8100;

High-level request flow:

```text
Client
  ↓
API Gateway
  ↓
Currency Conversion Service
  ↓
Currency Exchange Service
  ↓
Database
```

The API Gateway is the main external entry point. It validates JWT tokens and routes requests to the correct downstream microservice.

---

## Security

JWT authentication is implemented at the API Gateway layer.

The security flow is:

```text
User sends login request
  ↓
API Gateway validates credentials
  ↓
JWT token is generated
  ↓
Client sends token in Authorization header
  ↓
API Gateway validates token
  ↓
Protected microservice endpoints are accessed
```

This keeps authentication centralized instead of duplicating security logic inside every microservice.

---

## CI/CD Pipeline

The project uses multiple GitHub Actions workflows to automate validation, testing, image creation, infrastructure deployment, and Kubernetes deployment.

**Workflow 0 - Ansible Preflight Validation:** `pre-validation-ansible.yml`; validates project structure, Dockerfiles, Kubernetes manifests, Terraform files, and GitHub Actions files before build/deployment;  

**Workflow A - Java CI:** `workflow-a-ci.yml`; builds and tests all Java microservices;  

**Workflow B - Build and Push to Amazon ECR:** `workflow-b-docker-build-push.yml`; builds Docker images and pushes them to Amazon ECR;  

**Workflow C - Deploy to EKS Dev:** `workflow-c-deploy-dev.yml`; deploys updated Docker images to Amazon EKS;  

**Workflow D - Ansible Post-Deployment Validation:** `ansible-post-deployment-validation.yaml`; runs infrastructure checks, Kubernetes health checks, JWT tests, endpoint smoke tests, and observability checks;  

**Terraform Infrastructure Workflow:** `infrastructure-creation-workflow.yml`; creates and manages AWS infrastructure using Terraform;

Pipeline flow:

```text
Code Push
  ↓
Ansible Preflight Validation
  ↓
Java CI
  ↓
Docker Build and Push to ECR
  ↓
Deploy to Amazon EKS
  ↓
Ansible Post-Deployment Validation
```

The CI/CD design separates each responsibility into its own workflow so the project is easier to understand, debug, and extend.

---

## AWS Infrastructure

Terraform is used to create and manage AWS infrastructure.

Main AWS resources include:

- VPC
- Public and private subnets
- Internet Gateway
- NAT Gateway
- Amazon EKS cluster
- Amazon ECR repositories
- Amazon RDS PostgreSQL database
- IAM roles and policies
- GitHub OIDC identity provider integration
- S3 bucket for Terraform remote state
- DynamoDB table for Terraform state locking

The Terraform code is separated into multiple stacks so each infrastructure area can be managed independently.

Example Terraform stack organization:

```text
terraform/
  state-management/
  vpc/
  eks/
  database/
  workflow-b/
```

---

## Kubernetes Deployment

The application is deployed to Kubernetes using manifests stored in the `k8s/` directory.

Kubernetes resources include:

- Namespace
- Deployments
- Services
- ConfigMap
- Secrets
- Ingress
- Horizontal Pod Autoscalers
- Pod Disruption Budgets

The API Gateway is exposed through Kubernetes ingress configured for AWS Application Load Balancer routing. Internal services communicate inside the Kubernetes cluster.

---

## Ansible Validation

Ansible is used for validation and operational checks.

In this project, Ansible does not replace Terraform, Kubernetes, or GitHub Actions. Instead, it supports the deployment process by verifying that the project, infrastructure, and deployed application are working correctly.

Ansible playbooks include:

```text
ansible/playbooks/
  00-project-structure-validation.yml
  01-terraform-validation.yml
  02-docker-validation.yml
  03-kubernetes-manifest-validation.yml
  04-github-actions-validation.yml
  05-aws-infrastructure-verification.yml
  06-kubernetes-health-check.yml
  07-jwt-api-gateway-smoke-test.yml
  08-microservices-endpoint-smoke-test.yml
  09-zipkin-validation.yml
```

This shows a production-style approach where deployment is not considered complete until validation checks pass.

---

## Repository Structure

```text
.github/
  actions/                 Custom local GitHub Actions
  workflows/               CI/CD and infrastructure workflows

ansible/
  inventory/               Ansible inventory
  group_vars/              Shared Ansible variables
  playbooks/               Validation and smoke test playbooks

api-gateway/               Spring Boot API Gateway with JWT security

currency-conversion-service/
                            Currency conversion microservice

currency-exchange-service/
                            Currency exchange microservice

naming-server/             Eureka service discovery server

k8s/                       Kubernetes manifests

terraform/                 AWS infrastructure as code
```

---

## Detailed Documentation

Detailed documentation explaining how each technology is used in this project is located in the following files:


**docs/** /n
**01-application-architecture.md**  /n
**02-cicd-pipeline.md**    /n
**03-docker-kubernetes.md**    /n
**04-infrastructure-automation.md**   /n
**05-end-to-end-diagram.md**   /n


These documents explain the project in more depth than the main README.

---

## Project Status

The application, CI/CD pipeline, Kubernetes deployment, AWS infrastructure, and Ansible validation workflows were implemented and tested.

AWS infrastructure was destroyed after testing to avoid unnecessary cloud costs.

---

## Author

Ali Raza  
Backend Java Developer | DevOps Engineer  

Focus areas:

- Java
- Spring Boot
- Microservices
- REST APIs
- Docker
- Kubernetes
- AWS
- Terraform
- Ansible
- GitHub Actions
