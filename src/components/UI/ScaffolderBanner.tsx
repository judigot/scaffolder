import clsx from "clsx";
import { useState } from "react";
import type { ScaffolderSeverity } from "@/interfaces/scaffolderMessages.ts";

const severityStyles: Record<
	ScaffolderSeverity,
	{ icon: string; classes: string }
> = {
	error: { icon: "❌", classes: "bg-red-900 border-red-500 text-red-50" },
	warning: {
		icon: "⚠️",
		classes: "bg-yellow-900 border-yellow-500 text-yellow-50",
	},
	info: { icon: "ℹ️", classes: "bg-blue-900 border-blue-500 text-blue-50" },
};

interface IScaffolderBannerProps {
	severity: ScaffolderSeverity;
	title: string;
	details?: string[];
	suggestion?: string;
	file?: string;
	line?: number;
	onDismiss?: () => void;
	onNavigateToFile?: () => void;
}

export default function ScaffolderBanner({
	severity,
	title,
	details,
	suggestion,
	file,
	line,
	onDismiss,
	onNavigateToFile,
}: IScaffolderBannerProps) {
	const severityMeta = severityStyles[severity];
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const hasDetails =
		(details !== undefined && details.length > 0) ||
		(suggestion !== undefined && suggestion !== "");
	return (
		<div
			className={clsx(
				"border-l-4 px-4 py-3 rounded-s-lg shadow-sm mb-2 flex items-start gap-3",
				severityMeta.classes,
			)}
		>
			<span className="text-lg leading-none" aria-hidden>
				{severityMeta.icon}
			</span>
			<div className="flex-1">
				<p className="font-semibold leading-snug text-sm">{title}</p>
				{file !== undefined && file !== "" && (
					<p className="text-xs text-current opacity-80">
						File:{" "}
						{onNavigateToFile ? (
							<button
								type="button"
								onClick={onNavigateToFile}
								className="font-mono underline underline-offset-2 hover:text-white"
							>
								{file}
							</button>
						) : (
							<span className="font-mono">{file}</span>
						)}
						{line !== undefined && ` · Line ${String(line)}`}
					</p>
				)}
				{isExpanded && details !== undefined && details.length > 0 && (
					<ul className="text-xs list-disc list-inside space-y-0.5">
						{details.map((detail) => (
							<li key={detail}>{detail}</li>
						))}
					</ul>
				)}
				{isExpanded && suggestion !== undefined && suggestion !== "" && (
					<p className="text-xs mt-1">Suggestion: {suggestion}</p>
				)}
			</div>
			<div className="flex flex-col gap-2">
				{hasDetails && (
					<button
						type="button"
						onClick={() => {
							setIsExpanded((prev) => !prev);
						}}
						className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
					>
						{isExpanded ? "Hide" : "Details"}
					</button>
				)}
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
					>
						Dismiss
					</button>
				)}
			</div>
		</div>
	);
}
