import type { ReactNode } from "react";

type BannerVariant = "info" | "success" | "warning" | "error" | "danger";

export interface IBannerProps {
	variant: BannerVariant;
	title?: string;
	icon?: ReactNode;
	children: ReactNode;
	inline?: boolean;
	className?: string;
}

const variantStyles: Record<
	BannerVariant,
	{
		container: string;
		icon: string;
		title: string;
		body: string;
	}
> = {
	info: {
		container: "bg-primary-900/30 border-primary-700",
		icon: "text-primary-400",
		title: "text-primary-300",
		body: "text-primary-200/80",
	},
	success: {
		container: "bg-success-500/10 border-success-500/30",
		icon: "text-success-400",
		title: "text-success-300",
		body: "text-success-400",
	},
	warning: {
		container: "bg-orange-900/30 border-orange-700",
		icon: "text-orange-400",
		title: "text-orange-300",
		body: "text-orange-200/80",
	},
	error: {
		container: "bg-yellow-900/30 border-yellow-700",
		icon: "text-yellow-400",
		title: "text-yellow-300",
		body: "text-yellow-200/80",
	},
	danger: {
		container: "bg-danger-500/10 border-danger-500/30",
		icon: "text-danger-400",
		title: "text-danger-300",
		body: "text-danger-400",
	},
};

const defaultIcons: Record<BannerVariant, ReactNode> = {
	info: (
		<svg
			className="w-5 h-5 flex-shrink-0 mt-0.5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<title>Info</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	success: (
		<svg
			className="w-5 h-5 flex-shrink-0 mt-0.5"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<title>Success</title>
			<path
				fillRule="evenodd"
				d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
				clipRule="evenodd"
			/>
		</svg>
	),
	warning: (
		<svg
			className="w-5 h-5 flex-shrink-0 mt-0.5"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<title>Warning</title>
			<path
				fillRule="evenodd"
				d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
				clipRule="evenodd"
			/>
		</svg>
	),
	error: (
		<svg
			className="w-5 h-5 flex-shrink-0 mt-0.5"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<title>Error</title>
			<path
				fillRule="evenodd"
				d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
				clipRule="evenodd"
			/>
		</svg>
	),
	danger: (
		<svg
			className="w-5 h-5 flex-shrink-0 mt-0.5"
			fill="currentColor"
			viewBox="0 0 20 20"
		>
			<title>Error</title>
			<path
				fillRule="evenodd"
				d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
				clipRule="evenodd"
			/>
		</svg>
	),
};

export function Banner({
	variant,
	title,
	icon,
	children,
	inline = false,
	className = "",
}: IBannerProps) {
	const styles = variantStyles[variant];

	if (inline) {
		return (
			<div className={`p-3 border rounded-md ${styles.container} ${className}`}>
				<div className="flex items-center gap-2">
					<div className={styles.icon}>{icon ?? defaultIcons[variant]}</div>
					<p className={`text-xs md:text-sm ${styles.body}`}>
						{title !== undefined && title.length > 0 && (
							<span className={`font-medium ${styles.title}`}>{title}</span>
						)}{" "}
						{children}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`@container p-3 border rounded-md ${styles.container} ${className}`}
		>
			<div className="flex flex-col items-center gap-2 @sm:flex-row @sm:items-start">
				<div className={styles.icon}>{icon ?? defaultIcons[variant]}</div>
				<div className="flex-1 min-w-0 text-center @sm:text-left">
					{title !== undefined && title.length > 0 && (
						<p
							className={`text-xs md:text-sm font-medium mb-1 ${styles.title}`}
						>
							{title}
						</p>
					)}
					<div className={`text-xs md:text-sm ${styles.body}`}>{children}</div>
				</div>
			</div>
		</div>
	);
}
