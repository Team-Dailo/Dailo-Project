terraform {
  backend "s3" {
    bucket         = "dailo-terraform-state"
    key            = "stage/terraform.tfstate"
    region         = "ap-northeast-2"
    use_lockfile   = true
    encrypt        = true
  }
}
