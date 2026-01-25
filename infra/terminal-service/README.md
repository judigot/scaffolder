# Terminal Service (AWS EC2)

This Terraform config provisions a small Ubuntu EC2 instance that runs the SSH terminal API in a Docker container.

## Usage

```sh
terraform init
terraform apply \
  -var="region=us-east-1" \
  -var="vpc_id=vpc-xxxx" \
  -var="subnet_id=subnet-xxxx" \
  -var="container_image=ghcr.io/your-org/terminal-api:latest" \
  -var="service_port=3000" \
  -var='service_allowed_cidrs=["0.0.0.0/0"]'
```

## Notes

- Exposes `service_port` on the instance security group.
- Uses OpenSSH for Bun or `ssh2` for Node inside your container.
- If you need HTTPS, place this behind an ALB or reverse proxy.
