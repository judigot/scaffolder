output "instance_id" {
  value = aws_instance.terminal_service.id
}

output "public_ip" {
  value = aws_instance.terminal_service.public_ip
}

output "service_url" {
  value = var.associate_public_ip ? "http://${aws_instance.terminal_service.public_ip}:${var.service_port}" : "(no public IP)"
}
