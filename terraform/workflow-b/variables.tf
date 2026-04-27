variable "aws_region" {
  description = "AWS region for Workflow B resources"
  type        = string
  default     = "us-east-1"
}

variable "github_org" {
  description = "GitHub username or organization"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch allowed to assume the IAM role"
  type        = string
  default     = "main"
}

variable "role_name" {
  description = "IAM role name for GitHub Actions Workflow B"
  type        = string
  default     = "github-actions-workflow-b-ecr-role"
}

variable "policy_name" {
  description = "IAM policy name for Workflow B ECR permissions"
  type        = string
  default     = "github-actions-workflow-b-ecr-policy"
}

variable "ecr_repositories" {
  description = "ECR repositories required for Workflow B"
  type        = set(string)

  default = [
    "naming-server",
    "api-gateway",
    "currency-exchange-service",
    "currency-conversion-service"
  ]
}

variable "eks_cluster_name" {
  description = "EKS cluster name for workflow C deployments"
  type = string
}

