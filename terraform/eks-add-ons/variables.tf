variable "aws_region" {
  description = "AWS region where EKS add-ons will be installed"
  type        = string
  default     = "us-east-1"
}

variable "terraform_state_bucket_name" {
  description = "S3 bucket name used for Terraform remote state"
  type        = string
}

variable "terraform_lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking"
  type        = string
  default     = "currency-system-terraform-locks"
}

variable "aws_load_balancer_controller_chart_version" {
  description = "AWS Load Balancer Controller Helm chart version"
  type        = string
  default     = "1.14.0"
}