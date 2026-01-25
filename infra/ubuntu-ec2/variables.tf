variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "vpc_id" {
  description = "VPC ID for resources (leave empty for default VPC)"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Subnet ID for the EC2 instance (leave empty for auto-select)"
  type        = string
  default     = ""
}

variable "db_subnet_ids" {
  description = "Subnet IDs for the RDS subnet group (at least 2 in different AZs)"
  type        = list(string)
  default     = []
}

variable "enable_ec2" {
  description = "Enable or disable the EC2 instance"
  type        = bool
  default     = false
}

variable "enable_rds" {
  description = "Enable or disable the RDS instance"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
  default     = ""
}

variable "disk_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 10
}

variable "volume_type" {
  description = "Root volume type"
  type        = string
  default     = "gp3"
}

variable "associate_public_ip" {
  description = "Assign a public IP to the EC2 instance"
  type        = bool
  default     = true
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_engine" {
  description = "RDS database engine"
  type        = string
  default     = "postgres"
}

variable "db_engine_version" {
  description = "RDS database engine version"
  type        = string
  default     = "15"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "app_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "root"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
  default     = "password"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_publicly_accessible" {
  description = "Make RDS publicly accessible"
  type        = bool
  default     = false
}
