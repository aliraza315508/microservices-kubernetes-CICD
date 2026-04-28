// Creates a DB subnet group using private subnets.
// RDS PostgreSQL will live inside these private subnets.

resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project_name}-postgres-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-postgres-subnet-group"
  }
}
