// RDS endpoint (host your app will connect to)
output "postgres_endpoint" {
  description = "PostgreSQL RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
}

// RDS database name
output "postgres_db_name" {
  description = "PostgreSQL database name"
  value       = aws_db_instance.postgres.db_name
}

// RDS port
output "postgres_port" {
  description = "PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

// DynamoDB table name
output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.currency_rates.name
}

// DynamoDB table ARN (needed later for IAM/IRSA)
output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.currency_rates.arn
}