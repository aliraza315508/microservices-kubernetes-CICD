aws_region = "us-east-1"

github_org = "aliraza315508"

github_repo = "microservices-kubernetes-CICD"

github_branch = "main"

workflow_b_role_name = "github-actions-workflow-b-ecr-role"

workflow_b_policy_name = "github-actions-workflow-b-ecr-policy"

workflow_c_role_name = "github-actions-workflow-c-eks-deploy-role"

workflow_c_policy_name = "github-actions-workflow-c-eks-deploy-policy"

terraform_role_name = "github-actions-terraform-role"

terraform_policy_name = "github-actions-terraform-policy"

terraform_state_bucket_name = "currency-system-s3-aliraza315508"

terraform_lock_table_name = "currency-system-dynamo-db-aliraza315508"

ecr_repositories = [
  "naming-server",
  "api-gateway",
  "currency-exchange-service",
  "currency-conversion-service"
]

eks_cluster_name = "currency-system-cluster"