variable "db_password" {
  description = "RDS 데이터베이스의 마스터 비밀번호"
  type        = string
  sensitive   = true 
}

variable "discord_webhook_url" {
  description = "Discord Webhook URL for Grafana alerts"
  type        = string
}

variable "grafana_admin_password" {
  description = "Grafana Admin Password"
  type        = string
}