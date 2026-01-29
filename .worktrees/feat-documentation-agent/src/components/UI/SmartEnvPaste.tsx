import { useCallback, useRef, useState } from "react";
import {
	smartEnvMerge,
	type ISmartEnvMergeResult,
} from "@/utils/envParser.ts";

interface ISmartEnvPasteProps<T extends { key: string; value: string }> {
	existing: T[];
	createEntry: (key: string, value: string) => T;
	onMerge: (result: ISmartEnvMergeResult<T>) => void;
}

interface ISummaryState {
	added: string[];
	updated: string[];
	unchanged: string[];
	ignored: string[];
}

export function SmartEnvPaste<T extends { key: string; value: string }>({
	existing,
	createEntry,
	onMerge,
}: ISmartEnvPasteProps<T>) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [textValue, setTextValue] = useState("");
	const [summary, setSummary] = useState<ISummaryState | null>(null);
	const summaryTimerRef = useRef<number | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const showSummary = useCallback((s: ISummaryState) => {
		setSummary(s);
		if (summaryTimerRef.current !== null) {
			window.clearTimeout(summaryTimerRef.current);
		}
		summaryTimerRef.current = window.setTimeout(() => {
			setSummary(null);
			summaryTimerRef.current = null;
		}, 4000);
	}, []);

	const applyMerge = useCallback(
		(text: string) => {
			if (!text.trim()) {return;}

			const result = smartEnvMerge(existing, text, createEntry);
			onMerge(result);
			showSummary({
				added: result.added,
				updated: result.updated,
				unchanged: result.unchanged,
				ignored: result.ignored,
			});
			setTextValue("");
			setIsExpanded(false);
		},
		[existing, createEntry, onMerge, showSummary],
	);

	const handlePasteFromClipboard = useCallback(async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (!text.trim()) {
				showSummary({ added: [], updated: [], unchanged: [], ignored: ["Clipboard is empty"] });
				return;
			}
			applyMerge(text);
		} catch {
			showSummary({ added: [], updated: [], unchanged: [], ignored: ["Failed to read clipboard"] });
		}
	}, [applyMerge, showSummary]);

	const handleTextareaPaste = useCallback(
		(e: React.ClipboardEvent<HTMLTextAreaElement>) => {
			const pastedText = e.clipboardData.getData("text");
			if (pastedText.includes("=")) {
				e.preventDefault();
				applyMerge(pastedText);
			}
		},
		[applyMerge],
	);

	const handleApply = useCallback(() => {
		applyMerge(textValue);
	}, [applyMerge, textValue]);

	const totalChanges = summary
		? summary.added.length + summary.updated.length
		: 0;

	return (
		<div className="flex flex-col gap-2">
			{/* Action buttons */}
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => { void handlePasteFromClipboard(); }}
					className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 rounded-md text-xs font-medium transition-colors"
					aria-label="Smart paste .env from clipboard"
				>
					<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<title>Paste</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					Smart Paste
				</button>
				<button
					type="button"
					onClick={() => { setIsExpanded(!isExpanded); }}
					className="inline-flex items-center gap-1 px-2 py-1.5 text-neutral-400 hover:text-neutral-200 rounded-md text-xs transition-colors"
					aria-label={isExpanded ? "Hide bulk paste area" : "Show bulk paste area"}
				>
					<svg
						className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Toggle</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
					{isExpanded ? "Hide" : "Bulk"}
				</button>
			</div>

			{/* Expandable textarea */}
			{isExpanded && (
				<div className="flex flex-col gap-2">
					<textarea
						ref={textareaRef}
						value={textValue}
						onChange={(e) => { setTextValue(e.target.value); }}
						onPaste={handleTextareaPaste}
						placeholder={"Paste .env content here...\nKEY=value\nANOTHER_KEY=\"value with spaces\""}
						className="w-full min-h-[80px] px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary-500 resize-y"
						spellCheck={false}
					/>
					<button
						type="button"
						onClick={handleApply}
						disabled={!textValue.trim()}
						className="self-end inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-md text-xs font-medium transition-colors"
					>
						Apply
					</button>
				</div>
			)}

			{/* Non-blocking result summary */}
			{summary !== null && (totalChanges > 0 || summary.ignored.length > 0) && (
				<div className="flex flex-wrap items-center gap-2 px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-xs animate-in fade-in slide-in-from-top-1">
					{summary.added.length > 0 && (
						<span className="inline-flex items-center gap-1 text-success-400">
							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<title>Added</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{summary.added.length} added
						</span>
					)}
					{summary.updated.length > 0 && (
						<span className="inline-flex items-center gap-1 text-warning-400">
							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<title>Updated</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{summary.updated.length} updated
						</span>
					)}
					{summary.unchanged.length > 0 && (
						<span className="inline-flex items-center gap-1 text-neutral-500">
							{summary.unchanged.length} unchanged
						</span>
					)}
					{summary.ignored.length > 0 && (
						<span className="inline-flex items-center gap-1 text-neutral-500">
							{summary.ignored.length} ignored
						</span>
					)}
				</div>
			)}
		</div>
	);
}
