# S3 버킷 암호화 설정에서 AES256 VS KMS에 대한 고민

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket         = "dailo-terraform-state" 
    key            = "terraform.tfstate"     
    region         = "ap-northeast-2"
    encrypt        = true                    
    dynamodb_table = "terraform-lock-table"  
  }


}

provider "aws" {
  region = "ap-northeast-2"
}

##########################
# S3 + DynamoDB, tfstate #
##########################

# 1. 상태 파일(.tfstate)을 저장할 S3 버킷 생성
resource "aws_s3_bucket" "tf_state" {
  # {project}-{purpose}
  bucket = "dailo-terraform-state"

  lifecycle {
    # 실수로 버킷을 삭제하는 것을 방지
    prevent_destroy = false
  }
}

# 2. S3 버킷 버전 관리 활성화 
resource "aws_s3_bucket_versioning" "tf_state_versioning" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    # 기존 파일을 덮어쓰지 않고 이전 버전 그대로 보존
    status = "Enabled"
  }
}

# 3. S3 버킷 암호화 설정
resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state_encryption" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    # 업로드 되는 모든 객체는 자동 암호화
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 4. State Lock을 위한 DynamoDB 테이블 생성
resource "aws_dynamodb_table" "tf_state_lock" {
  name         = "terraform-lock-table"
  billing_mode = "PAY_PER_REQUEST" # 사용한 만큼만 지불 
  hash_key     = "LockID"

  # Hash Key 이름은 반드시 "LockID"여야 함 (Terraform 규칙)
  attribute {
    name = "LockID"
    type = "S"
  }
}
