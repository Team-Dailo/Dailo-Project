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
      Environment = "stage"
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
  static_bucket_name = "dailo-stage-static-2026" 
  db_name            = "dailo_stage"
  db_username        = "admin"
}

data "aws_route53_zone" "selected" {
  name = "dailoapp.com"
}

data "aws_ecr_repository" "dailo" {
  name = "dailo" 
}

# ------------------------------------------------------------------------------
# 2. VPC 모듈
# ------------------------------------------------------------------------------
module "vpc" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/vpc?ref=main"

  name     = "dailo-stage"
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
# 3. ECS 모듈 
# ------------------------------------------------------------------------------
module "ecs" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/ecs?ref=main"

  name   = "dailo-stage"
  region = "ap-northeast-2"

  ami_id = "ami-0291c43558f414816" 

  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.was_subnet_ids

  domain_name     = "stage-api.dailoapp.com"
  route53_zone_id = data.aws_route53_zone.selected.zone_id

  bucket_name        = local.static_bucket_name
  ecr_repository_url = data.aws_ecr_repository.dailo.repository_url

  key_name      = "stage_key" 
  instance_type = "t3.micro"  

  asg_min     = 1
  asg_max     = 2
  asg_desired = 1

  cpu    = 256
  memory = 512
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
    }
  ]
  container_secrets = [
    {
      name      = "SPRING_DATASOURCE_PASSWORD"
      valueFrom = module.rds.ssm_db_password_arn
    }
  ]
}

# ------------------------------------------------------------------------------
# 4. RDS 모듈
# ------------------------------------------------------------------------------
module "rds" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/rds?ref=main"

  name   = "dailo-stage"
  vpc_id = module.vpc.vpc_id
  
  db_subnet_ids = module.vpc.db_subnet_ids
  was_sg_id     = module.ecs.ecs_node_security_group_id

  db_engine            = "mysql"
  db_engine_version    = "8.0"
  db_instance_class    = "db.t3.micro"
  db_allocated_storage = 20
  
  db_multi_az          = false 

  db_name     = local.db_name
  db_username = local.db_username
  db_password = var.db_password 
}

# ------------------------------------------------------------------------------
# 5. CDN 모듈
# ------------------------------------------------------------------------------
module "cdn" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/cdn?ref=main"

  providers = {
    aws.virginia = aws.virginia
  }

  name        = "dailo-stage-cdn"
  bucket_name = local.static_bucket_name

  domain_name     = "stage.dailoapp.com"
  route53_zone_id = data.aws_route53_zone.selected.zone_id

  alb_dns_name = module.ecs.alb_dns_name
}