// Reads outputs from terraform/vpc so this stack can reuse the same VPC and private subnets.
data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    bucket         = var.terraform_state_bucket_name
    key            = "vpc/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = var.terraform_lock_table_name
    encrypt        = true
  }
}

// Creates the DB subnet group using private subnets from terraform/vpc.
resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project_name}-postgres-subnet-group"
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  tags = {
    Name = "${var.project_name}-postgres-subnet-group"
  }
}

/// Security group for RDS PostgreSQL.
// RDS does not depend on EKS directly.
// It allows PostgreSQL traffic from the shared app security group created in terraform/vpc.
resource "aws_security_group" "postgres" {
  name        = "${var.project_name}-postgres-sg"
  description = "Allow PostgreSQL access from application workloads"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    description              = "PostgreSQL from shared application security group"
    from_port                = 5432
    to_port                  = 5432
    protocol                 = "tcp"
    source_security_group_id = data.terraform_remote_state.vpc.outputs.app_security_group_id
  }

  egress {
    description = "Allow outbound traffic from RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-postgres-sg"
  }
}


// Creates private AWS RDS PostgreSQL for the currency-exchange service.
resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-postgres"

  engine         = "postgres"
  engine_version = "16.3"

  instance_class        = var.db_instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"

  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]

  publicly_accessible = false
  multi_az            = false

  backup_retention_period = 7
  skip_final_snapshot     = var.skip_final_snapshot
  deletion_protection     = var.deletion_protection

  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-postgres"
  }
}