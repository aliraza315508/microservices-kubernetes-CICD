variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "vpc_id" {
  description = "EKS VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets from EKS"
  type        = list(string)
}

variable "allowed_cidr" {
  description = "CIDR allowed to access RDS (use VPC CIDR)"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "DB username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "DB password"
  type        = string
  sensitive   = true
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
}