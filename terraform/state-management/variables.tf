variable "aws_region" {
  description = "AWS region where Terraform backend resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for Terraform backend resource naming"
  type        = string
  default     = "currency-system"
}

variable "terraform_state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state"
  type        = string
}

variable "terraform_lock_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
  default     = "currency-system-terraform-locks"
}