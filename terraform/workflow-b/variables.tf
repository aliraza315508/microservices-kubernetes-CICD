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
  description = "GitHub branch allowed to assume the IAM roles"
  type        = string
  default     = "main"
}

variable "workflow_b_role_name" {
  description = "IAM role name for GitHub Actions Workflow B"
  type        = string
  default     = "github-actions-workflow-b-ecr-role"
}

variable "workflow_b_policy_name" {
  description = "IAM policy name for Workflow B ECR permissions"
  type        = string
  default     = "github-actions-workflow-b-ecr-policy"
}

variable "workflow_c_role_name" {
  description = "IAM role name for GitHub Actions Workflow C"
  type        = string
  default     = "github-actions-workflow-c-eks-deploy-role"
}

variable "workflow_c_policy_name" {
  description = "IAM policy name for Workflow C EKS/RDS permissions"
  type        = string
  default     = "github-actions-workflow-c-eks-deploy-policy"
}

variable "terraform_role_name" {
  description = "IAM role name for Terraform infrastructure and state-management workflows"
  type        = string
  default     = "github-actions-terraform-role"
}

variable "terraform_policy_name" {
  description = "IAM policy name for Terraform infrastructure and state-management workflows"
  type        = string
  default     = "github-actions-terraform-policy"
}

variable "terraform_state_bucket_name" {
  description = "S3 bucket name used for Terraform remote state"
  type        = string
}

variable "terraform_lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking"
  type        = string
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
  description = "EKS cluster name for Workflow C deployments"
  type        = string
}