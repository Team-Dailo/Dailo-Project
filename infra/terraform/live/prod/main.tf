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
# 1. VPC 모듈 호출 (GitHub에서 가져오기)
# ------------------------------------------------------------------------------
module "vpc" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/vpc?ref=main"

  name     = "dailo-prod"
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
# 2. WAS 모듈 호출
# ------------------------------------------------------------------------------
data "aws_route53_zone" "selected" {
  name = "dailoapp.com"
}

module "was" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/was-app?ref=main"

  name   = "dailo-prod"
  vpc_id = module.vpc.vpc_id 

  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.was_subnet_ids 

  # EC2 설정
  ami_id        = "ami-0678ccb690e8a9c67"
  instance_type = "t2.micro"
  key_name      = "prod_key" 

  # 오토스케일링 설정
  asg_min     = 2
  asg_max     = 4
  asg_desired = 2

  # https & route53 설정
  domain_name = "dailoapp.com"
  route53_zone_id = data.aws_route53_zone.selected.zone_id

  bucket_name = "dailoa-prod-static-2026"
}

# ------------------------------------------------------------------------------
# 3. RDS 모듈 호출
# ------------------------------------------------------------------------------
module "rds" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/rds?ref=main"

  name   = "dailo-prod"
  vpc_id = module.vpc.vpc_id
  
  db_subnet_ids = module.vpc.db_subnet_ids
  was_sg_id     = module.was.was_sg_id 

  # DB 설정
  db_engine            = "mysql"
  db_engine_version    = "8.0"
  db_instance_class    = "db.t3.micro"
  db_allocated_storage = 20
  db_multi_az          = true 

  # 계정 정보
  db_name     = "dailodb"
  db_username = "admin"
  db_password = var.db_password 
}

# ------------------------------------------------------------------------------
# 4. cdn 모듈 테스트
# ------------------------------------------------------------------------------
module "cdn" {
  source = "git::https://github.com/yuntyu01/terraform-aws-modules.git//modules/cdn?ref=main"

  providers = {
    aws.virginia = aws.virginia
  }

  name        = "dailo-cdn"
  bucket_name = "dailoa-prod-static-2026"

  domain_name     = "dailoapp.com"
  route53_zone_id = data.aws_route53_zone.selected.zone_id

  alb_dns_name = module.was.alb_dns_name
}