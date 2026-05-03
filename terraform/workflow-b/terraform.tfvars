aws_region = "us-east-1"

github_org = "aliraza315508"

github_repo = "microservices-kubernetes-CICD"

github_branch = "main"

role_name = "github-actions-workflow-b-ecr-role"

policy_name = "github-actions-workflow-b-ecr-policy"

ecr_repositories = [
  "naming-server",
  "api-gateway",
  "currency-exchange-service",
  "currency-conversion-service"
]

eks_cluster_name = "currency-system-cluster"