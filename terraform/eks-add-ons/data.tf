// Reads outputs from the already-created terraform/eks stack.
data "terraform_remote_state" "eks" {
  backend = "s3"

  config = {
    bucket         = var.terraform_state_bucket_name
    key            = "eks/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = var.terraform_lock_table_name
    encrypt        = true
  }
}

// Stores EKS remote-state outputs in short local names.
locals {
  cluster_name      = data.terraform_remote_state.eks.outputs.cluster_name
  cluster_endpoint  = data.terraform_remote_state.eks.outputs.cluster_endpoint
  cluster_ca_data   = data.terraform_remote_state.eks.outputs.cluster_certificate_authority_data
  cluster_oidc_url  = data.terraform_remote_state.eks.outputs.cluster_oidc_issuer_url
  oidc_provider_arn = data.terraform_remote_state.eks.outputs.cluster_oidc_provider_arn
  vpc_id            = data.terraform_remote_state.eks.outputs.vpc_id
}