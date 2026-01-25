variable "region" {
  description = "AWS region for the terminal service"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID for the terminal service"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "EC2 key pair name for SSH access"
  type        = string
  default     = ""
}

variable "associate_public_ip" {
  description = "Assign a public IP to the instance"
  type        = bool
  default     = true
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_ssh" {
  description = "Allow SSH access on port 22"
  type        = bool
  default     = true
}

variable "service_port" {
  description = "Port the terminal service listens on"
  type        = number
  default     = 3000
}

variable "service_allowed_cidrs" {
  description = "CIDR blocks allowed to reach the service port"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "container_image" {
  description = "Container image to run (includes the terminal API)"
  type        = string
}

variable "container_env" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}
