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
variable "alb_verify_secret" {
  description = "X-origin-verify 헤더 검증 비밀번호"
  type        = string
  sensitive   = true 
}
variable "MAIL_PASSWORD" {
  description = "email passowrd"
  type        = string
  sensitive   = true 
}
variable "kakao_client_secret" {
  description = "oauth2.0 kakao secret"
  type        = string
  sensitive   = true 
}
variable "kakao_client_id" {
  type        = string
  sensitive   = true 
}
variable "jwt_secret" {
  description = "jwt_secret"
  type        = string
  sensitive   = true 
}
variable "mail_from" {
  type        = string
  sensitive   = true 
}
variable "mail_username" {
  type        = string
  sensitive   = true 
}
variable "bus_api_key" {
  type        = string
  sensitive   = true 
}
variable "bus_api_key_encoded" {
  type        = string
  sensitive   = true 
}