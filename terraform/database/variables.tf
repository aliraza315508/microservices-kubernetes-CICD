variable "aws_region" {
  description = "AWS region where RDS will be created"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for RDS resource naming"
  type        = string
  default     = "currency-system"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "currencydb"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial RDS storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum autoscaled RDS storage in GB"
  type        = number
  default     = 100
}
variable "deletion_protection" {
  description = "Whether deletion protection is enabled for the RDS instance"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Whether to skip final snapshot when deleting the RDS instance"
  type        = bool
  default     = true
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