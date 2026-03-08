output "vpc_id" {
  description = "생성된 VPC ID"
  value       = module.vpc.vpc_id
}

output "rds_endpoint" {
  description = "RDS 접속 주소"
  value       = module.rds.endpoint
}