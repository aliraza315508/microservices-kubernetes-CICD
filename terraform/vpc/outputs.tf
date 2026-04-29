output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "cluster_name" {
  description = "EKS cluster name used by Kubernetes subnet discovery tags"
  value       = var.cluster_name
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "vpc_id" {
  description = "Shared VPC ID for EKS and RDS"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "Shared VPC CIDR"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs for internet-facing load balancers"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs for EKS worker nodes and RDS"
  value       = aws_subnet.private[*].id
}