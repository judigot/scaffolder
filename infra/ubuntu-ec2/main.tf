provider "aws" {
  region = var.aws_region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

locals {
  vpc_id    = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id
  subnet_id = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.default.ids[0]
  db_subnet_ids = length(var.db_subnet_ids) >= 2 ? var.db_subnet_ids : (
    length(data.aws_subnets.default.ids) >= 2 ? slice(data.aws_subnets.default.ids, 0, 2) : []
  )
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "main" {
  count      = var.enable_ec2 && var.ssh_public_key != "" ? 1 : 0
  key_name   = "ubuntu-ec2-key-${random_id.suffix.hex}"
  public_key = var.ssh_public_key
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_security_group" "ec2" {
  count       = var.enable_ec2 ? 1 : 0
  name        = "ubuntu-ec2-sg-${random_id.suffix.hex}"
  description = "Security group for Ubuntu EC2 instance"
  vpc_id      = local.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ubuntu-ec2-sg-${random_id.suffix.hex}"
  }
}

resource "aws_instance" "main" {
  count                       = var.enable_ec2 ? 1 : 0
  ami                         = var.custom_ami != "" ? var.custom_ami : data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  associate_public_ip_address = var.associate_public_ip
  vpc_security_group_ids      = [aws_security_group.ec2[0].id]
  key_name                    = var.ssh_public_key != "" ? aws_key_pair.main[0].key_name : null

  root_block_device {
    volume_size = var.disk_size
    volume_type = var.volume_type
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y git curl wget unzip
  EOF

  tags = {
    Name = "ubuntu-ec2-${random_id.suffix.hex}"
  }
}

resource "aws_security_group" "rds" {
  count       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? 1 : 0
  name        = "ubuntu-rds-sg-${random_id.suffix.hex}"
  description = "Security group for RDS instance"
  vpc_id      = local.vpc_id

  ingress {
    from_port       = var.db_engine == "postgres" ? 5432 : 3306
    to_port         = var.db_engine == "postgres" ? 5432 : 3306
    protocol        = "tcp"
    security_groups = var.enable_ec2 ? [aws_security_group.ec2[0].id] : []
    cidr_blocks     = var.enable_ec2 ? [] : var.ssh_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ubuntu-rds-sg-${random_id.suffix.hex}"
  }
}

resource "aws_db_subnet_group" "main" {
  count      = var.enable_rds && length(local.db_subnet_ids) >= 2 ? 1 : 0
  name       = "ubuntu-rds-subnet-group-${random_id.suffix.hex}"
  subnet_ids = local.db_subnet_ids

  tags = {
    Name = "ubuntu-rds-subnet-group-${random_id.suffix.hex}"
  }
}

resource "aws_db_instance" "main" {
  count                  = var.enable_rds && length(local.db_subnet_ids) >= 2 ? 1 : 0
  identifier             = "ubuntu-rds-${random_id.suffix.hex}"
  engine                 = var.db_engine
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = var.db_publicly_accessible
  skip_final_snapshot    = true
  storage_encrypted      = true

  tags = {
    Name = "ubuntu-rds-${random_id.suffix.hex}"
  }
}
