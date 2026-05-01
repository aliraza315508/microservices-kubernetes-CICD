terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    key            = "workflow-b/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "currency-system-terraform-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}