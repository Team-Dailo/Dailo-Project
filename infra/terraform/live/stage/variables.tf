variable "db_password" {
  description = "RDS 데이터베이스의 마스터 비밀번호"
  type        = string
  sensitive   = true 
}