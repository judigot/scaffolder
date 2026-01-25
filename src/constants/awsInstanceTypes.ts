export interface IInstanceType {
	value: string;
	label: string;
	description: string;
}

export interface IInstanceTypeGroup {
	label: string;
	options: IInstanceType[];
}

export const EC2_INSTANCE_GROUPS: IInstanceTypeGroup[] = [
	{
		label: "AI / High-Performance",
		options: [
			{
				value: "g4dn.xlarge",
				label: "g4dn.xlarge",
				description: "Balanced Dev & Inference",
			},
			{
				value: "g5.12xlarge",
				label: "g5.12xlarge",
				description: "Mid-Scale AI Training",
			},
			{
				value: "p4d.24xlarge",
				label: "p4d.24xlarge",
				description: "Large-Scale AI Training",
			},
			{
				value: "p5.48xlarge",
				label: "p5.48xlarge",
				description: "Extreme AI Training",
			},
		],
	},
	{
		label: "GPU-Enabled",
		options: [
			{
				value: "g4dn.medium",
				label: "g4dn.medium",
				description: "Entry GPU instance",
			},
			{
				value: "g4dn.xlarge",
				label: "g4dn.xlarge",
				description: "Standard GPU instance",
			},
			{
				value: "g5.12xlarge",
				label: "g5.12xlarge",
				description: "High-end GPU instance",
			},
			{
				value: "g5.48xlarge",
				label: "g5.48xlarge",
				description: "Max GPU instance",
			},
			{
				value: "p4d.24xlarge",
				label: "p4d.24xlarge",
				description: "NVIDIA A100 cluster",
			},
			{
				value: "p5.48xlarge",
				label: "p5.48xlarge",
				description: "NVIDIA H100 cluster",
			},
		],
	},
	{
		label: "General Purpose",
		options: [
			{
				value: "t3.small",
				label: "t3.small",
				description: "Burstable small",
			},
			{
				value: "t3.medium",
				label: "t3.medium",
				description: "Burstable medium",
			},
			{
				value: "c5ad.large",
				label: "c5ad.large",
				description: "Compute optimized",
			},
			{
				value: "m7i.xlarge",
				label: "m7i.xlarge",
				description: "General purpose",
			},
			{
				value: "m7i.2xlarge",
				label: "m7i.2xlarge",
				description: "General purpose 2x",
			},
			{
				value: "c7i.2xlarge",
				label: "c7i.2xlarge",
				description: "Compute optimized 2x",
			},
			{
				value: "r7i.xlarge",
				label: "r7i.xlarge",
				description: "Memory optimized",
			},
			{
				value: "m7i.4xlarge",
				label: "m7i.4xlarge",
				description: "General purpose 4x",
			},
			{
				value: "c7i.4xlarge",
				label: "c7i.4xlarge",
				description: "Compute optimized 4x",
			},
			{
				value: "r7i.4xlarge",
				label: "r7i.4xlarge",
				description: "Memory optimized 4x",
			},
			{
				value: "m7i.8xlarge",
				label: "m7i.8xlarge",
				description: "General purpose 8x",
			},
		],
	},
] as const;

export const RDS_INSTANCE_GROUPS: IInstanceTypeGroup[] = [
	{
		label: "General Purpose",
		options: [
			{
				value: "db.t3.small",
				label: "db.t3.small",
				description: "Burstable small",
			},
			{
				value: "db.t3.medium",
				label: "db.t3.medium",
				description: "Burstable medium",
			},
			{
				value: "db.m5.large",
				label: "db.m5.large",
				description: "General purpose",
			},
			{
				value: "db.m5.xlarge",
				label: "db.m5.xlarge",
				description: "General purpose xl",
			},
			{
				value: "db.m6g.large",
				label: "db.m6g.large",
				description: "Graviton general purpose",
			},
		],
	},
	{
		label: "Memory Optimized",
		options: [
			{
				value: "db.r5.large",
				label: "db.r5.large",
				description: "Memory optimized",
			},
			{
				value: "db.r5.xlarge",
				label: "db.r5.xlarge",
				description: "Memory optimized xl",
			},
			{
				value: "db.r6g.large",
				label: "db.r6g.large",
				description: "Graviton memory optimized",
			},
			{
				value: "db.r6i.large",
				label: "db.r6i.large",
				description: "Intel memory optimized",
			},
		],
	},
	{
		label: "Extreme Memory",
		options: [
			{
				value: "db.x2g.large",
				label: "db.x2g.large",
				description: "Graviton extreme memory",
			},
			{
				value: "db.x2g.xlarge",
				label: "db.x2g.xlarge",
				description: "Graviton extreme memory xl",
			},
			{
				value: "db.x2iedn.xlarge",
				label: "db.x2iedn.xlarge",
				description: "Intel extreme memory xl",
			},
		],
	},
] as const;

export interface IAwsRegion {
	value: string;
	label: string;
	description: string;
}

export interface IAwsRegionGroup {
	label: string;
	options: IAwsRegion[];
}

export const AWS_REGION_GROUPS: IAwsRegionGroup[] = [
	{
		label: "US East",
		options: [
			{
				value: "us-east-1",
				label: "us-east-1",
				description: "N. Virginia",
			},
			{
				value: "us-east-2",
				label: "us-east-2",
				description: "Ohio",
			},
		],
	},
	{
		label: "US West",
		options: [
			{
				value: "us-west-1",
				label: "us-west-1",
				description: "N. California",
			},
			{
				value: "us-west-2",
				label: "us-west-2",
				description: "Oregon",
			},
		],
	},
	{
		label: "Europe",
		options: [
			{
				value: "eu-west-1",
				label: "eu-west-1",
				description: "Ireland",
			},
			{
				value: "eu-west-2",
				label: "eu-west-2",
				description: "London",
			},
			{
				value: "eu-west-3",
				label: "eu-west-3",
				description: "Paris",
			},
			{
				value: "eu-central-1",
				label: "eu-central-1",
				description: "Frankfurt",
			},
			{
				value: "eu-north-1",
				label: "eu-north-1",
				description: "Stockholm",
			},
		],
	},
	{
		label: "Asia Pacific",
		options: [
			{
				value: "ap-northeast-1",
				label: "ap-northeast-1",
				description: "Tokyo",
			},
			{
				value: "ap-northeast-2",
				label: "ap-northeast-2",
				description: "Seoul",
			},
			{
				value: "ap-southeast-1",
				label: "ap-southeast-1",
				description: "Singapore",
			},
			{
				value: "ap-southeast-2",
				label: "ap-southeast-2",
				description: "Sydney",
			},
			{
				value: "ap-south-1",
				label: "ap-south-1",
				description: "Mumbai",
			},
		],
	},
	{
		label: "South America",
		options: [
			{
				value: "sa-east-1",
				label: "sa-east-1",
				description: "São Paulo",
			},
		],
	},
	{
		label: "Canada",
		options: [
			{
				value: "ca-central-1",
				label: "ca-central-1",
				description: "Montreal",
			},
		],
	},
] as const;

export const DEFAULT_AWS_REGION = "us-east-2";
export const DEFAULT_EC2_INSTANCE_TYPE = "t3.small";
export const DEFAULT_RDS_INSTANCE_TYPE = "db.t3.small";

export const DEFAULT_DISK_SIZE_GB = 10;
export const DEFAULT_VOLUME_TYPE = "gp3";

export const DEFAULT_DB_NAME = "app_db";
export const DEFAULT_DB_USERNAME = "root";
export const DEFAULT_DB_PASSWORD = "password";

export const WORKSPACE_MODES = {
	VCS: "vcs",
	API: "api",
} as const;

export type WorkspaceMode =
	(typeof WORKSPACE_MODES)[keyof typeof WORKSPACE_MODES];
