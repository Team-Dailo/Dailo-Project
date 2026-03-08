variable "terraform_role_name" {
  description = "IAM role name for Terraform workflows"
  type        = string
  default     = "dailo-github-actions-terraform"
}

variable "deploy_role_name" {
  description = "IAM role name for app deploy workflows"
  type        = string
  default     = "dailo-github-actions-deploy"
}

variable "terraform_allowed_branches" {
  description = "Branches allowed to assume terraform role"
  type        = list(string)
  default     = ["main", "stage"]
}

variable "deploy_allowed_branches" {
  description = "Branches allowed to assume deploy role"
  type        = list(string)
  default     = ["main", "stage"]
}

