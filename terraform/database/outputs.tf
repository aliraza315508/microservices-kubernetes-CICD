output "postgres_address" {
  description = "PostgreSQL hostname only. Use this as DB_HOST in Kubernetes ConfigMap."
  value       = aws_db_instance.postgres.address
}

output "postgres_endpoint" {
  description = "PostgreSQL endpoint with port"
  value       = aws_db_instance.postgres.endpoint
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "postgres_db_name" {
  description = "PostgreSQL database name"
  value       = aws_db_instance.postgres.db_name
}

output "postgres_security_group_id" {
  description = "Security group attached to RDS PostgreSQL"
  value       = aws_security_group.postgres.id
}