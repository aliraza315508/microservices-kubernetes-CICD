output "aws_load_balancer_controller_role_arn" {
  description = "IAM role ARN used by AWS Load Balancer Controller"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "aws_load_balancer_controller_policy_arn" {
  description = "IAM policy ARN used by AWS Load Balancer Controller"
  value       = aws_iam_policy.aws_load_balancer_controller.arn
}

output "aws_load_balancer_controller_service_account_name" {
  description = "Kubernetes service account used by AWS Load Balancer Controller"
  value       = kubernetes_service_account.aws_load_balancer_controller.metadata[0].name
}

output "aws_load_balancer_controller_helm_release_name" {
  description = "Helm release name for AWS Load Balancer Controller"
  value       = helm_release.aws_load_balancer_controller.name
}