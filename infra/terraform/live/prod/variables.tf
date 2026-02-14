variable "db_password" {
  description = "RDS 데이터베이스의 마스터 비밀번호"
  type        = string
  sensitive   = true 
}

variable "discord_webhook_url" {
  description = "알람용 디스코드 웹훅 URL"
  type        = string
  sensitive   = true 
}

variable "grafana_admin_password" {
  description = "그라파나 admin 계정 비밀번호"
  type        = string
  sensitive   = true 
}
