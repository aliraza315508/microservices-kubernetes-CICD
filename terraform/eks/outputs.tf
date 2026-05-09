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

output "cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_oidc_issuer_url" {
  description = "EKS OIDC issuer URL"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_oidc_provider_arn" {
  description = "IAM OIDC provider ARN used for IRSA"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "cluster_security_group_id" {
  description = "EKS cluster security group ID. Database stack can allow PostgreSQL traffic from EKS."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "node_group_name" {
  description = "EKS managed node group name"
  value       = aws_eks_node_group.main.node_group_name
}

output "vpc_id" {
  description = "VPC ID consumed from terraform/vpc"
  value       = data.terraform_remote_state.vpc.outputs.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs consumed from terraform/vpc"
  value       = data.terraform_remote_state.vpc.outputs.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs consumed from terraform/vpc"
  value       = data.terraform_remote_state.vpc.outputs.public_subnet_ids
}