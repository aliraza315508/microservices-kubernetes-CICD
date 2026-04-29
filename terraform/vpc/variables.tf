variable "aws_region" {
  description = "AWS region where the VPC will be created"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for VPC resource naming"
  type        = string
  default     = "currency-system"
}

variable "vpc_cidr" {
  description = "CIDR block for the shared VPC used by EKS and RDS"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of AZ/subnet pairs to create"
  type        = number
  default     = 2
}