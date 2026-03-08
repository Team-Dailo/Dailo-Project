terraform {
  backend "s3" {
    bucket         = "dailo-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-2"
    use_lockfile   = true
    encrypt        = true
  }
}
