output "workflow_b_role_arn" {
  description = "ARN of the IAM role assumed by Workflow B for ECR image push"
  value       = aws_iam_role.workflow_b_role.arn
}

output "workflow_b_role_name" {
  description = "Name of the IAM role assumed by Workflow B"
  value       = aws_iam_role.workflow_b_role.name
}

output "workflow_c_role_arn" {
  description = "ARN of the IAM role assumed by Workflow C for EKS deployment"
  value       = aws_iam_role.workflow_c_role.arn
}

output "workflow_c_role_name" {
  description = "Name of the IAM role assumed by Workflow C"
  value       = aws_iam_role.workflow_c_role.name
}

output "terraform_role_arn" {
  description = "ARN of the IAM role assumed by infrastructure and state-management workflows"
  value       = aws_iam_role.terraform_role.arn
}

output "terraform_role_name" {
  description = "Name of the IAM role assumed by infrastructure and state-management workflows"
  value       = aws_iam_role.terraform_role.name
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    for name, repo in aws_ecr_repository.repos : name => repo.repository_url
  }
}