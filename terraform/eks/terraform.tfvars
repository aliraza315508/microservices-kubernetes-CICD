aws_region = "us-east-1"

cluster_name = "currency-system-cluster"

kubernetes_version = "1.31"

allowed_cidr = "76.124.66.34/32"

node_instance_type = "t3.medium"

desired_nodes = 1
min_nodes     = 1
max_nodes     = 2

terraform_lock_table_name = "currency-system-terraform-locks"