output "instance_id" {
  description = "EC2 instance ID"
  value       = var.enable_ec2 ? aws_instance.main[0].id : null
}

output "dev_ip" {
  description = "EC2 public IP address"
  value       = var.enable_ec2 ? aws_instance.main[0].public_ip : null
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = var.enable_ec2 && aws_instance.main[0].public_ip != "" ? "ssh ubuntu@${aws_instance.main[0].public_ip}" : null
}

output "rds_endpoint" {
  description = "RDS instance endpoint (with port)"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? aws_db_instance.main[0].endpoint : null
}

output "rds_address" {
  description = "RDS instance address (hostname only)"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? aws_db_instance.main[0].address : null
}

output "rds_port" {
  description = "RDS instance port"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? aws_db_instance.main[0].port : null
}

output "db_endpoint" {
  description = "The connection endpoint for the RDS instance (hostname only)"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? aws_db_instance.main[0].address : null
}

output "db_username" {
  description = "The username for the RDS database"
  value       = var.enable_rds ? var.db_username : null
}

output "db_password" {
  description = "The password for the RDS database"
  value       = var.enable_rds ? var.db_password : null
  sensitive   = true
}

output "db_port" {
  description = "The port for the RDS instance"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? aws_db_instance.main[0].port : null
}

output "db_connection_string" {
  description = "Database connection string"
  value       = var.enable_rds && length(local.db_subnet_ids) >= 2 ? "${var.db_engine}://${var.db_username}:${var.db_password}@${aws_db_instance.main[0].endpoint}/${var.db_name}" : null
  sensitive   = true
}
