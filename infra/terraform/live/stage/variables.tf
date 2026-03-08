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

variable "alb_verify_secret" {
  description = "X-origin-verify 헤더 검증 비밀번호"
  type        = string
  sensitive   = true
}

variable "MAIL_PASSWORD" {
  description = "email password"
  type        = string
  sensitive   = true
}

variable "kakao_client_secret" {
  description = "oauth2.0 kakao"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "jwt_secret"
  type        = string
  sensitive   = true
}
