// --------------------------------------------------
// DATA SOURCES
// --------------------------------------------------

// Gets details about the current AWS account.
data "aws_caller_identity" "current" {}


// Gets information about the target EKS cluster.
// Used so we can reference its ARN in the Workflow C EKS policy.
data "aws_eks_cluster" "target" {
  name = var.eks_cluster_name
}


// Builds the trust policy document for GitHub OIDC.
// This allows GitHub Actions from your repo/branch to assume IAM roles.
data "aws_iam_policy_document" "github_oidc_assume_role_policy" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRoleWithWebIdentity"
    ]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/${var.github_branch}"
      ]
    }
  }
}


// --------------------------------------------------
// RESOURCES
// --------------------------------------------------

// Creates the GitHub OIDC provider in AWS IAM.
// This lets GitHub Actions use OIDC instead of long-lived AWS keys.
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]
}


// Creates all ECR repositories defined in var.ecr_repositories.
// These repositories store Docker images for your microservices.
resource "aws_ecr_repository" "repos" {
  for_each = var.ecr_repositories

  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}


// --------------------------------------------------
// WORKFLOW B ROLE AND POLICY
// --------------------------------------------------

// Creates IAM policy for Workflow B.
// This policy allows Workflow B to authenticate to ECR and push Docker images.
resource "aws_iam_policy" "workflow_b_ecr_policy" {
  name        = var.workflow_b_policy_name
  description = "IAM policy for Workflow B to push Docker images to ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      // Required for Docker login to Amazon ECR.
      {
        Sid    = "AllowECRAuthorization"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },

      // Allows image push operations only to this project's ECR repositories.
      {
        Sid    = "AllowECRImagePush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:DescribeRepositories"
        ]
        Resource = [
          for repo in aws_ecr_repository.repos : repo.arn
        ]
      }
    ]
  })
}


// Creates the IAM role used only by Workflow B.
resource "aws_iam_role" "workflow_b_role" {
  name               = var.workflow_b_role_name
  assume_role_policy = data.aws_iam_policy_document.github_oidc_assume_role_policy.json
}


// Attaches the ECR push policy to the Workflow B role.
resource "aws_iam_role_policy_attachment" "attach_workflow_b_ecr_policy" {
  role       = aws_iam_role.workflow_b_role.name
  policy_arn = aws_iam_policy.workflow_b_ecr_policy.arn
}


// --------------------------------------------------
// WORKFLOW C ROLE AND POLICY
// --------------------------------------------------

// Creates IAM policy for Workflow C.
// This policy allows Workflow C to describe EKS and read RDS DB details.
resource "aws_iam_policy" "workflow_c_eks_deploy_policy" {
  name        = var.workflow_c_policy_name
  description = "IAM policy for Workflow C to deploy to EKS and read RDS details"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      // Needed by aws eks update-kubeconfig.
      {
        Sid    = "AllowEKSDescribeCluster"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster"
        ]
        Resource = data.aws_eks_cluster.target.arn
      },

      // Needed by Workflow C to read DB host, port, and DB name from RDS.
      {
        Sid    = "AllowRDSDescribeDBInstances"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      }
    ]
  })
}


// Creates the IAM role used only by Workflow C.
resource "aws_iam_role" "workflow_c_role" {
  name               = var.workflow_c_role_name
  assume_role_policy = data.aws_iam_policy_document.github_oidc_assume_role_policy.json
}


// Attaches the EKS/RDS policy to the Workflow C role.
resource "aws_iam_role_policy_attachment" "attach_workflow_c_eks_deploy_policy" {
  role       = aws_iam_role.workflow_c_role.name
  policy_arn = aws_iam_policy.workflow_c_eks_deploy_policy.arn
}


// Creates an EKS access entry for the Workflow C IAM role.
// This tells the EKS cluster to recognize this IAM role as a valid cluster principal.
resource "aws_eks_access_entry" "workflow_c" {
  cluster_name  = var.eks_cluster_name
  principal_arn = aws_iam_role.workflow_c_role.arn
  type          = "STANDARD"
}


// Associates an EKS access policy with the Workflow C IAM role.
// This grants Kubernetes permissions inside the cluster.
// For learning, this uses cluster-wide admin access.
// Later, this can be tightened with namespace-level Kubernetes RBAC.
resource "aws_eks_access_policy_association" "workflow_c_admin" {
  cluster_name  = var.eks_cluster_name
  principal_arn = aws_iam_role.workflow_c_role.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}


// --------------------------------------------------
// TERRAFORM INFRASTRUCTURE / STATE ROLE AND POLICY
// --------------------------------------------------

// Creates IAM policy for Terraform infrastructure and state-management workflows.
// This policy allows Terraform to manage project infrastructure,
// read/write remote state in S3, and use DynamoDB state locking.
resource "aws_iam_policy" "terraform_infrastructure_policy" {
  name        = var.terraform_policy_name
  description = "IAM policy for Terraform infrastructure and state-management GitHub Actions workflows"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      // Allows Terraform to identify the AWS account.
      {
        Sid    = "AllowSTSRead"
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage VPC, subnets, route tables, NAT gateways,
      // internet gateways, security groups, and other EC2 networking resources.
      {
        Sid    = "AllowEC2AndNetworkingManagement"
        Effect = "Allow"
        Action = [
          "ec2:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage EKS clusters, node groups, access entries,
      // and EKS-related resources.
      {
        Sid    = "AllowEKSManagement"
        Effect = "Allow"
        Action = [
          "eks:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage RDS database resources.
      {
        Sid    = "AllowRDSManagement"
        Effect = "Allow"
        Action = [
          "rds:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage ECR repositories used by Workflow B.
      {
        Sid    = "AllowECRManagement"
        Effect = "Allow"
        Action = [
          "ecr:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage IAM roles and policies required by EKS,
      // GitHub Actions OIDC, AWS Load Balancer Controller, and workflow roles.
      {
        Sid    = "AllowIAMManagement"
        Effect = "Allow"
        Action = [
          "iam:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to pass IAM roles to AWS services like EKS.
      {
        Sid    = "AllowPassRole"
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage load balancer related resources if needed.
      {
        Sid    = "AllowLoadBalancerManagement"
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:*"
        ]
        Resource = "*"
      },

      // Allows Terraform/EKS-related resources to work with Auto Scaling.
      {
        Sid    = "AllowAutoScalingManagement"
        Effect = "Allow"
        Action = [
          "autoscaling:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage CloudWatch and logs resources.
      {
        Sid    = "AllowCloudWatchAndLogsManagement"
        Effect = "Allow"
        Action = [
          "cloudwatch:*",
          "logs:*"
        ]
        Resource = "*"
      },

      // Allows Terraform to manage the S3 backend bucket.
      // This is needed because this same role will also run state-management.
      {
        Sid    = "AllowTerraformStateBucketManagement"
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
          "s3:GetBucketEncryption",
          "s3:PutBucketEncryption",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPublicAccessBlock",
          "s3:GetBucketOwnershipControls",
          "s3:PutBucketOwnershipControls",
          "s3:GetLifecycleConfiguration",
          "s3:PutLifecycleConfiguration"
        ]
        Resource = [
          "arn:aws:s3:::${var.terraform_state_bucket_name}"
        ]
      },

      // Allows Terraform to read/write state files in the S3 backend bucket.
      {
        Sid    = "AllowTerraformStateObjectManagement"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.terraform_state_bucket_name}/*"
        ]
      },

      // Allows Terraform to manage and use the DynamoDB lock table.
      {
        Sid    = "AllowTerraformLockTableManagement"
        Effect = "Allow"
        Action = [
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:UpdateTable",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:ListTagsOfResource",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.terraform_lock_table_name}"
        ]
      }
    ]
  })
}


// Creates the IAM role used by Terraform infrastructure and state-management workflows.
resource "aws_iam_role" "terraform_role" {
  name               = var.terraform_role_name
  assume_role_policy = data.aws_iam_policy_document.github_oidc_assume_role_policy.json
}


// Attaches Terraform infrastructure permissions to the Terraform role.
resource "aws_iam_role_policy_attachment" "attach_terraform_infrastructure_policy" {
  role       = aws_iam_role.terraform_role.name
  policy_arn = aws_iam_policy.terraform_infrastructure_policy.arn
}