// --------------------------------------------------
// DATA SOURCES
// --------------------------------------------------

// Gets details about the current AWS account
data "aws_caller_identity" "current" {}


// Gets information about the target EKS cluster
// Used so we can reference its ARN in the EKS access policy
data "aws_eks_cluster" "target" {
  name = var.eks_cluster_name
}


// Builds the trust policy document for GitHub OIDC
// This allows GitHub Actions from your repo/branch to assume the IAM role
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

// Creates the GitHub OIDC provider in AWS IAM
// This lets GitHub Actions use OIDC instead of long-lived AWS keys
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]
}


// Creates all ECR repositories defined in var.ecr_repositories
// These repositories will store Docker images for your microservices
resource "aws_ecr_repository" "repos" {
  for_each = var.ecr_repositories

  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}


// Creates IAM policy for Workflow B
// This policy allows GitHub Actions to authenticate to ECR
// and push Docker images into the created repositories
resource "aws_iam_policy" "github_actions_ecr_policy" {
  name        = var.policy_name
  description = "IAM policy for GitHub Actions to push Docker images to ECR"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:PutImage",
          "ecr:BatchGetImage"
        ]
        Resource = [
          for repo in aws_ecr_repository.repos : repo.arn
        ]
      }
    ]
  })
}


// Creates IAM policy for Workflow C
// This policy allows GitHub Actions to describe the EKS cluster
// so aws eks update-kubeconfig can work
resource "aws_iam_policy" "github_actions_eks_policy" {
  name        = "github-actions-workflow-c-eks-policy"
  description = "IAM policy for GitHub Actions to access EKS for Workflow C"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster"
        ]
        Resource = data.aws_eks_cluster.target.arn
      }
    ]
  })
}


// Creates the IAM role that GitHub Actions will assume through OIDC
resource "aws_iam_role" "github_actions_role" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.github_oidc_assume_role_policy.json
}


// Attaches the ECR push policy to the GitHub Actions role
// Needed for Workflow B to build and push images to ECR
resource "aws_iam_role_policy_attachment" "attach_ecr_policy" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = aws_iam_policy.github_actions_ecr_policy.arn
}


// Attaches the EKS access policy to the GitHub Actions role
// Needed for Workflow C to connect to the EKS cluster
resource "aws_iam_role_policy_attachment" "attach_eks_policy" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = aws_iam_policy.github_actions_eks_policy.arn
}


// Creates an EKS access entry for the GitHub Actions IAM role
// This tells the EKS cluster to recognize this IAM role as a valid cluster principal
resource "aws_eks_access_entry" "github_actions" {
  cluster_name  = var.eks_cluster_name
  principal_arn = aws_iam_role.github_actions_role.arn
  type          = "STANDARD"
}


// Associates an EKS access policy with the GitHub Actions IAM role
// This grants Kubernetes permissions inside the cluster
// AmazonEKSClusterAdminPolicy gives cluster-wide admin access
resource "aws_eks_access_policy_association" "github_actions_admin" {
  cluster_name  = var.eks_cluster_name
  principal_arn = aws_iam_role.github_actions_role.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}