terraform {
  backend "s3" {
    bucket         = "dailo-terraform-state" 
    key            = "prod/terraform.tfstate" 
    region         = "ap-northeast-2"
    dynamodb_table = "terraform-lock-table" 
    encrypt        = true
  }
}