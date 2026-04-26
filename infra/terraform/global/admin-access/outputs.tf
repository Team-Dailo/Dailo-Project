output "iam_user_name" {
  description = "생성된 IAM 유저 이름"
  value       = aws_iam_user.db_admin.name
}

output "access_key_id" {
  description = "CLI 접속용 Access Key ID"
  value       = aws_iam_access_key.db_admin.id
}

output "secret_access_key" {
  description = "CLI 접속용 Secret Access Key"
  value       = aws_iam_access_key.db_admin.secret
  sensitive   = true
}

output "console_password" {
  description = "콘솔 초기 비밀번호"
  value       = aws_iam_user_login_profile.db_admin.password
  sensitive   = true
}

output "usage" {
  description = "접속 방법 안내"
  value       = <<-EOT
    # 1. AWS CLI 프로필 설정
    aws configure --profile dailo-db-admin

    # 2. EC2 SSM 접속
    aws ssm start-session --target <instance-id> --region ap-northeast-2 --profile dailo-db-admin

    # 3. RDS 포트포워딩
    aws ssm start-session --target <instance-id> \
      --document-name AWS-StartPortForwardingSessionToRemoteHost \
      --parameters '{"host":["<rds-endpoint>"],"portNumber":["3306"],"localPortNumber":["3307"]}' \
      --region ap-northeast-2 --profile dailo-db-admin
  EOT
}
