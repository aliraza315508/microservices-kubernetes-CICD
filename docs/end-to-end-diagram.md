# End-to-End System Diagram

```mermaid
flowchart TD
    A[Developer pushes code to GitHub]

    subgraph PRECHECK[Workflow 0 - Ansible Preflight Validation]
        B1[Validate project structure]
        B2[Validate Terraform files]
        B3[Validate Dockerfiles]
        B4[Validate Kubernetes manifests]
        B5[Validate GitHub Actions files]
        B1 --> B2 --> B3 --> B4 --> B5
    end

    subgraph CI[Workflow A - Java CI]
        C1[Matrix build for naming-server]
        C2[Matrix build for api-gateway]
        C3[Matrix build for currency-exchange-service]
        C4[Matrix build for currency-conversion-service]
        C5[Run Maven tests]
        C6[Upload JAR artifacts and test reports]
        C1 --> C5
        C2 --> C5
        C3 --> C5
        C4 --> C5
        C5 --> C6
    end

    subgraph BUILD[Workflow B - Docker Build and Push]
        D1[prepare-build-matrix]
        D2[Detect changed services]
        D3[prepare-image-metadata]
        D4[Build Docker images]
        D5[Push images to Amazon ECR]
        D6[Tag images as latest and sha-commit]
        D7[create-deployment-metadata]
        D8[Upload deployment metadata artifact]
        D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7 --> D8
    end

    subgraph DEPLOY[Workflow C - Deploy to Amazon EKS]
        E1[Download deployment metadata]
        E2[Configure AWS credentials]
        E3[Update kubeconfig]
        E4[deploy-to-eks custom action]
        E5[Apply namespace and common resources]
        E6[Create or update ConfigMap]
        E7[Create or update Secret]
        E8[Apply service manifests]
        E9[Apply ingress and Zipkin]
        E10[Update images with ECR SHA tag]
        E11[Check rollout status]
        E1 --> E2 --> E3 --> E4 --> E5 --> E6 --> E7 --> E8 --> E9 --> E10 --> E11
    end

    subgraph AWS[AWS Infrastructure]
        T1[Terraform state<br/>S3 + DynamoDB]
        T2[VPC]
        T3[Amazon RDS PostgreSQL]
        T4[Amazon EKS]
        T5[AWS Load Balancer Controller]
        T6[Amazon ECR]
        T7[GitHub Actions IAM Roles]
        T1 --> T2 --> T3
        T2 --> T4
        T4 --> T5
        T6 --> E10
        T7 --> E2
        T7 --> D5
    end

    subgraph K8S[Amazon EKS / Kubernetes Runtime]
        K1[Kubernetes Namespace<br/>currency-system]

        K2[API Gateway Deployment and Service]
        K3[Naming Server Deployment and Service]
        K4[Currency Exchange Deployment and Service]
        K5[Currency Conversion Deployment and Service]
        K6[Zipkin Deployment and Service]

        K7[ConfigMap]
        K8[Secret]
        K9[HPA]
        K10[PDB]
        K11[Ingress]
        K12[AWS Application Load Balancer]

        K1 --> K2
        K1 --> K3
        K1 --> K4
        K1 --> K5
        K1 --> K6
        K1 --> K7
        K1 --> K8
        K1 --> K9
        K1 --> K10
        K1 --> K11

        K11 --> K12
        K7 --> K2
        K7 --> K3
        K7 --> K4
        K7 --> K5
        K8 --> K2
        K8 --> K4
        K8 --> K5
    end

    subgraph RUNTIME[Runtime Request Flow]
        R1[User request]
        R2[AWS Application Load Balancer]
        R3[Kubernetes Ingress]
        R4[API Gateway]
        R5[JWT Authentication]
        R6[Route request]
        R7[Currency Exchange Service]
        R8[Currency Conversion Service]
        R9[PostgreSQL / Amazon RDS]
        R10[Eureka Naming Server]
        R11[Zipkin Tracing]

        R1 --> R2 --> R3 --> R4 --> R5 --> R6
        R6 --> R7
        R6 --> R8
        R8 --> R7
        R7 --> R9

        R4 --> R10
        R7 --> R10
        R8 --> R10

        R4 --> R11
        R7 --> R11
        R8 --> R11
    end

    subgraph POSTCHECK[Workflow D - Ansible Post-Deployment Validation]
        F1[Verify AWS infrastructure]
        F2[Check Kubernetes health]
        F3[Test JWT / API Gateway login]
        F4[Test microservice endpoints]
        F5[Validate Zipkin]
        F1 --> F2 --> F3 --> F4 --> F5
    end

    subgraph TERRAFORM[Terraform Infrastructure Workflow]
        G1[Run terraform fmt]
        G2[Run terraform init]
        G3[Run terraform validate]
        G4[Run terraform plan]
        G5[Run terraform apply]
        G1 --> G2 --> G3 --> G4 --> G5
    end

    A --> B1
    B5 --> C1
    B5 --> C2
    B5 --> C3
    B5 --> C4

    C6 --> D1
    D5 --> T6
    D8 --> E1

    G5 --> T1
    G5 --> T2
    G5 --> T3
    G5 --> T4
    G5 --> T5
    G5 --> T6
    G5 --> T7

    E11 --> K1
    K12 --> R2

    E11 --> F1
```