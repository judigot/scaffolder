import { useCallback, useEffect, useRef, useState } from "react";

export interface ISelectOption {
	value: string;
	label: string;
	description?: string;
}

export interface ISelectGroup {
	label: string;
	options: ISelectOption[];
}

export interface IGroupedSelectProps {
	value: string;
	onChange: (value: string) => void;
	groups: ISelectGroup[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	id?: string;
	"aria-label"?: string;
}

export default function GroupedSelect({
	value,
	onChange,
	groups,
	placeholder = "Select an option",
	disabled = false,
	className = "",
	id,
	"aria-label": ariaLabel,
}: IGroupedSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selectedOption = groups
		.flatMap((g) => g.options)
		.find((o) => o.value === value);

	const handleSelect = useCallback(
		(optionValue: string) => {
			onChange(optionValue);
			setIsOpen(false);
		},
		[onChange],
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && listRef.current && value) {
			const selectedEl = listRef.current.querySelector(
				`[data-value="${value}"]`,
			);
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [isOpen, value]);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				id={id}
				onClick={() => {
					if (!disabled) setIsOpen(!isOpen);
				}}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className="w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-between gap-2"
			>
				<span className={selectedOption ? "text-fg" : "text-fg-muted"}>
					{selectedOption
						? `${selectedOption.label}${selectedOption.description ? ` — ${selectedOption.description}` : ""}`
						: placeholder}
				</span>
				<svg
					className={`w-4 h-4 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Toggle</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{isOpen && (
				<div
					ref={listRef}
					role="listbox"
					className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto scrollbar-thin bg-bg-muted border border-border rounded-md shadow-lg"
				>
					{groups.map((group) => (
						<div key={group.label}>
							<div className="px-3 py-1.5 text-[10px] font-semibold text-fg-subtle uppercase tracking-wider bg-bg-muted border-b border-border sticky top-0">
								{group.label}
							</div>
							{group.options.map((option) => (
								<button
									key={option.value}
									type="button"
									data-value={option.value}
									onClick={() => {
										handleSelect(option.value);
									}}
									className={`w-full px-3 py-2 text-left text-sm transition-colors ${
										option.value === value
											? "bg-primary-600/20 text-primary-300"
											: "text-fg hover:bg-secondary-hover"
									}`}
								>
									<span className="font-medium">{option.label}</span>
									{option.description && (
										<span className="text-fg-subtle ml-1">
											— {option.description}
										</span>
									)}
								</button>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export interface ISimpleSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: ISelectOption[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	id?: string;
	"aria-label"?: string;
}

export function SimpleSelect({
	value,
	onChange,
	options,
	placeholder = "Select an option",
	disabled = false,
	className = "",
	id,
	"aria-label": ariaLabel,
}: ISimpleSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.value === value);

	const handleSelect = useCallback(
		(optionValue: string) => {
			onChange(optionValue);
			setIsOpen(false);
		},
		[onChange],
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	useEffect(() => {
		if (isOpen && listRef.current && value) {
			const selectedEl = listRef.current.querySelector(
				`[data-value="${value}"]`,
			);
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [isOpen, value]);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				id={id}
				onClick={() => {
					if (!disabled) setIsOpen(!isOpen);
				}}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className="w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-between gap-2"
			>
				<span className={selectedOption ? "text-fg" : "text-fg-muted"}>
					{selectedOption
						? `${selectedOption.label}${selectedOption.description ? ` — ${selectedOption.description}` : ""}`
						: placeholder}
				</span>
				<svg
					className={`w-4 h-4 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Toggle</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{isOpen && (
				<div
					ref={listRef}
					role="listbox"
					className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto scrollbar-thin bg-bg-muted border border-border rounded-md shadow-lg"
				>
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							data-value={option.value}
							onClick={() => {
								handleSelect(option.value);
							}}
							className={`w-full px-3 py-2 text-left text-sm transition-colors ${
								option.value === value
									? "bg-primary-600/20 text-primary-300"
									: "text-fg hover:bg-secondary-hover"
							}`}
						>
							<span className="font-medium">{option.label}</span>
							{option.description && (
								<span className="text-fg-subtle ml-1">
									— {option.description}
								</span>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
