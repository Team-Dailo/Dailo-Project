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
  default_tags {
    tags = {
      Environment = "prod"
      Project     = "Dailo"
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "virginia"
  region = "us-east-1"
}


# ------------------------------------------------------------------------------
# 1. Global & Base Resources
# ------------------------------------------------------------------------------

locals {
  static_bucket_name = "dailo-prod-static-2026"
  db_name     = "dailo"
  db_username     = "dailo"
  name = "dailo"
  domain_name = "dailoapp.com"
}

data "aws_route53_zone" "selected" {
  name = local.domain_name
}

data "aws_ecr_repository" "dailo" {
  name = "dailo" 
}

data "aws_acm_certificate" "global_cert" {
  provider    = aws.virginia
  domain      = "dailoapp.com"
  statuses    = ["ISSUED"]
  most_recent = true
}

resource "aws_ssm_parameter" "mail_password" {
  name  = "/dailo/prod/mail_password"
  type  = "SecureString"
  value = var.MAIL_PASSWORD
}

resource "aws_ssm_parameter" "kakao_client_secret" {
  name  = "/dailo/prod/kakao_secret"
  type  = "SecureString"
  value = var.kakao_client_secret
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/dailo/prod/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}

 
# ------------------------------------------------------------------------------
# 1. VPC 모듈
# ------------------------------------------------------------------------------
module "vpc" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/vpc?ref=v0.1.3"

  name     = local.name
  region   = "ap-northeast-2"
  vpc_cidr = "10.0.0.0/16"

  public_subnet_a_cidr = "10.0.1.0/24"
  public_subnet_c_cidr = "10.0.2.0/24"

  was_subnet_a_cidr = "10.0.10.0/24"
  was_subnet_c_cidr = "10.0.11.0/24"

  db_subnet_a_cidr = "10.0.20.0/24"
  db_subnet_c_cidr = "10.0.21.0/24"
}

# ------------------------------------------------------------------------------
# 2. ecs 모듈
# ------------------------------------------------------------------------------
module "ecs" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/ecs?ref=v0.1.3"

  name   = local.name
  region = "ap-northeast-2" # CloudWatch 로그 등을 위해 사용

  ami_id = "ami-0291c43558f414816"

  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.was_subnet_ids # ECS 노드가 배치될 Private Subnet

  bucket_name        = local.static_bucket_name # IAM 정책 연결용
  ecr_repository_url = data.aws_ecr_repository.dailo.repository_url # 이미지 Pull용

  # [EC2 설정]
  key_name      = "prod_key" 
  instance_type = "t3.small" 

  # [Auto Scaling 설정]
  asg_min     = 2
  asg_max     = 4
  asg_desired = 2

  # 테스크 값
  #desired_count = 2
  cpu = 512
  memory = 1024
  container_port = 8080
  container_env = [
    {
      name  = "SPRING_DATASOURCE_URL"
      value = "jdbc:mysql://${module.rds.address}:3306/${local.db_name}?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul"
    },
    {
      name  = "SPRING_DATASOURCE_USERNAME"
      value = local.db_username
    },
    {
      name  = "TZ"
      value = "Asia/Seoul"
    },
    {
      name  = "AWS_REGION"
      value = "ap-northeast-2"
    },
    {
      name  = "AWS_S3_BUCKET"
      value = local.static_bucket_name  
    },
    { name = "MAIL_HOST", value = "smtp.gmail.com" },
    { name = "MAIL_PORT", value = "587" },
    { name = "MAIL_USERNAME", value = "dailoappco@gmail.com" },
    { name = "MAIL_FROM", value = "dailoappco@gmail.com" },
    { name = "KAKAO_CLIENT_ID", value = "c031f9a2eed5d03cdde3d299d0babc48" },
  ]
    container_secrets = [
    {
      name      = "SPRING_DATASOURCE_PASSWORD"
      valueFrom = module.rds.ssm_db_password_arn
    },
    {
      name      = "MAIL_PASSWORD"
      valueFrom = aws_ssm_parameter.mail_password.arn
    },
    {
      name      = "KAKAO_CLIENT_SECRET"
      valueFrom = aws_ssm_parameter.kakao_client_secret.arn
    },
    {
      name      = "JWT_SECRET"
      valueFrom = aws_ssm_parameter.jwt_secret.arn
    }
  ]

  alb_verify_secret = var.alb_verify_secret
}


# ------------------------------------------------------------------------------
# 3. RDS 모듈
# ------------------------------------------------------------------------------
module "rds" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/rds?ref=v0.1.3"

  name   = local.name
  vpc_id = module.vpc.vpc_id
  
  db_subnet_ids = module.vpc.db_subnet_ids
  was_sg_id = module.ecs.ecs_node_security_group_id

  # DB 설정
  db_engine            = "mysql"
  db_engine_version    = "8.0"
  db_instance_class    = "db.t3.micro"
  db_allocated_storage = 20
  db_multi_az          = true 

  # 계정 정보
  db_name     = local.db_name
  db_username = local.db_username
  db_password = var.db_password 
}

# ------------------------------------------------------------------------------
# 4. cdn 모듈
# ------------------------------------------------------------------------------
module "cdn" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/cdn?ref=v0.1.3"
  
  name        = local.name
  bucket_name = local.static_bucket_name
  domain_name     = local.domain_name
  static_path_pattern = "/static/*"
  alb_dns_name = module.ecs.alb_dns_name


  route53_zone_id = data.aws_route53_zone.selected.zone_id
  cloudfront_cert_arn = data.aws_acm_certificate.global_cert.arn

  alb_verify_secret = var.alb_verify_secret
}

# ------------------------------------------------------------------------------
# 5. Monitoring (Grafana) 모듈 테스트
# ------------------------------------------------------------------------------
module "monitoring" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/monitoring?ref=v0.1.3" 

  name   = local.name   
  region = "ap-northeast-2"

  vpc_id    = module.vpc.vpc_id
  
  alb_arn   = module.ecs.alb_arn               
  alb_sg_id = module.ecs.alb_security_group_id 
  http_listener_arn = module.ecs.http_listener_arn

  cluster_id   = module.ecs.cluster_id
  cluster_name = module.ecs.ecs_cluster_name   
  ecs_exec_role_arn = module.ecs.task_exec_role_arn
  asg_name = module.ecs.asg_name
  app_log_group_name = module.ecs.log_group_name
  domain_name     = local.domain_name
  
  cpu    = 512  
  memory = 512 

  rds_endpoint = module.rds.address 

  db_username = local.db_username
  discord_webhook_url = var.discord_webhook_url
  grafana_admin_password = var.grafana_admin_password
  db_password = var.db_password

  grafana_container_env = [
    { name = "GF_DATABASE_TYPE", value = "mysql" },
    { name = "GF_DATABASE_HOST", value = "${module.rds.endpoint}" },
    { name = "GF_SERVER_ROOT_URL", value = "https://${local.domain_name}/grafana/" },
    { name = "GF_SERVER_SERVE_FROM_SUB_PATH", value = "true" },
    { name = "GF_DATABASE_PASSWORD", value = var.db_password },
    { name = "GF_DATABASE_NAME", value = "grafana" },
    { name = "GF_DATABASE_USER", value = local.db_username },

  ]
}