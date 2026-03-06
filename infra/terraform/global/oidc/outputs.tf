output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "terraform_role_arn" {
  description = "Role ARN for Terraform workflows"
  value       = aws_iam_role.terraform.arn
}

output "deploy_role_arn" {
  description = "Role ARN for CD deploy workflows"
  value       = aws_iam_role.deploy.arn
}
