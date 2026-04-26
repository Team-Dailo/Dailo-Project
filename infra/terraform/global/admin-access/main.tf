terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
}

locals {
  name = "dailo"
}

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# 1. IAM User
# ------------------------------------------------------------------------------
resource "aws_iam_user" "db_admin" {
  name = "${local.name}-db-admin"
  tags = {
    Purpose = "EC2 SSM + RDS terminal access"
  }
}

# 콘솔 로그인용 (필요 시)
resource "aws_iam_user_login_profile" "db_admin" {
  user                    = aws_iam_user.db_admin.name
  password_reset_required = false
}

# CLI 접속용 Access Key
resource "aws_iam_access_key" "db_admin" {
  user = aws_iam_user.db_admin.name
}

# ------------------------------------------------------------------------------
# 2. IAM Policy - SSM Session + EC2 Describe + SSM Parameter Read
# ------------------------------------------------------------------------------
resource "aws_iam_policy" "db_admin" {
  name        = "${local.name}-db-admin-policy"
  description = "SSM session to EC2, port forwarding to RDS, read DB params"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMSessionManage"
        Effect = "Allow"
        Action = [
          "ssm:TerminateSession",
          "ssm:ResumeSession",
          "ssm:DescribeSessions",
          "ssm:GetConnectionStatus"
        ]
        Resource = "*"
      },
      {
        Sid    = "SSMSessionToECSNodes"
        Effect = "Allow"
        Action = ["ssm:StartSession"]
        Resource = [
          "arn:aws:ec2:ap-northeast-2:${data.aws_caller_identity.current.account_id}:instance/*"
        ]
        Condition = {
          StringLike = {
            "ssm:resourceTag/Name" = "${local.name}-ecs-node"
          }
        }
      },
      {
        Sid    = "SSMDocuments"
        Effect = "Allow"
        Action = ["ssm:StartSession"]
        Resource = [
          "arn:aws:ssm:ap-northeast-2:${data.aws_caller_identity.current.account_id}:document/SSM-SessionManagerRunShell",
          "arn:aws:ssm:*::document/AWS-StartPortForwardingSession",
          "arn:aws:ssm:*::document/AWS-StartPortForwardingSessionToRemoteHost"
        ]
      },
      {
        Sid    = "EC2Describe"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags"
        ]
        Resource = "*"
      },
      {
        Sid    = "SSMParamReadDB"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:ap-northeast-2:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/db/*"
      },
      {
        Sid    = "RDSDescribe"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      },
      {
        Sid    = "ChangeOwnPassword"
        Effect = "Allow"
        Action = [
          "iam:ChangePassword",
          "iam:GetAccountPasswordPolicy"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/${aws_iam_user.db_admin.name}"
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "db_admin" {
  user       = aws_iam_user.db_admin.name
  policy_arn = aws_iam_policy.db_admin.arn
}
