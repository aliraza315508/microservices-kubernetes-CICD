output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "vpc_id" {
  description = "VPC ID consumed from terraform/vpc"
  value       = data.terraform_remote_state.vpc.outputs.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs consumed from terraform/vpc"
  value       = data.terraform_remote_state.vpc.outputs.private_subnet_ids
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM role ARN used by AWS Load Balancer Controller"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "cluster_security_group_id" {
  description = "EKS cluster security group ID. Database stack can allow PostgreSQL traffic from EKS."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}
