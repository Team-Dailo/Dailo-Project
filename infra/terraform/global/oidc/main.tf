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
  repo_full_name = "Team-Dailo/Dailo-Project"

  project_prefix = "dailo"

  # Terraform 실행은 특정 브랜치(var.terraform_allowed_branches)와 
  # PR(pull_request) 이벤트일 때만 허용되도록 설정
  terraform_subs = concat(
    [for b in var.terraform_allowed_branches : "repo:${local.repo_full_name}:ref:refs/heads/${b}"],
    ["repo:${local.repo_full_name}:pull_request"]
  )

  deploy_subs = [for b in var.deploy_allowed_branches : "repo:${local.repo_full_name}:ref:refs/heads/${b}"]

  deploy_role_name = "dailo-github-actions-deploy"
  terraform_role_name = "dailo-github-actions-terraform"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "terraform_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

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
      values   = local.terraform_subs
    }
  }
}

data "aws_iam_policy_document" "deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

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
      values   = local.deploy_subs
    }
  }
}

resource "aws_iam_role" "terraform" {
  name               = local.terraform_role_name
  assume_role_policy = data.aws_iam_policy_document.terraform_assume_role.json
}

resource "aws_iam_role" "deploy" {
  name               = local.deploy_role_name
  assume_role_policy = data.aws_iam_policy_document.deploy_assume_role.json
}

resource "aws_iam_role_policy_attachment" "terraform_admin" {
  role       = aws_iam_role.terraform.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role_policy_attachment" "deploy_poweruser" {
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

data "aws_iam_policy_document" "deploy_passrole" {
  statement {
    sid     = "AllowPassRoleForEcsTaskDefinitions"
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      "arn:aws:iam::*:role/${local.project_prefix}-*",
      "arn:aws:iam::*:role/${local.project_prefix}-stage-*"
    ]
  }
}

resource "aws_iam_policy" "deploy_passrole" {
  name   = "${local.deploy_role_name}-passrole"
  policy = data.aws_iam_policy_document.deploy_passrole.json
}

resource "aws_iam_role_policy_attachment" "deploy_passrole" {
  role       = aws_iam_role.deploy.name
  policy_arn = aws_iam_policy.deploy_passrole.arn
}
