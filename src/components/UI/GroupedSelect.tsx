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
	/** Keyboard event handler (for inline editing scenarios) */
	onKeyDown?: (event: React.KeyboardEvent) => void;
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
	onKeyDown,
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

	// Get flat list of all options for keyboard navigation
	const allOptions = groups.flatMap((g) => g.options);

	// Handle keyboard events on the trigger button
	const handleButtonKeyDown = (event: React.KeyboardEvent) => {
		// Pass through to external handler if provided
		if (onKeyDown !== undefined) {
			onKeyDown(event);
		}

		// Handle arrow keys to navigate options when open
		if (isOpen) {
			const currentIndex = allOptions.findIndex((o) => o.value === value);
			if (event.key === "ArrowDown") {
				event.preventDefault();
				const nextIndex = Math.min(currentIndex + 1, allOptions.length - 1);
				onChange(allOptions[nextIndex].value);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				const prevIndex = Math.max(currentIndex - 1, 0);
				onChange(allOptions[prevIndex].value);
			}
		} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setIsOpen(true);
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current !== null &&
				// eslint-disable-next-line no-type-assertion/no-type-assertion
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
		if (isOpen && listRef.current !== null && value !== "") {
			const selectedEl = listRef.current.querySelector(
				`[data-value="${value}"]`,
			);
			if (selectedEl !== null) {
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
					if (!disabled) {
						setIsOpen(!isOpen);
					}
				}}
				onKeyDown={handleButtonKeyDown}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className="form-select-trigger flex items-center justify-between gap-2 text-left text-sm"
			>
				<span
					className={selectedOption !== undefined ? "text-fg" : "text-fg-muted"}
				>
					{selectedOption !== undefined
						? `${selectedOption.label}${selectedOption.description !== undefined ? ` — ${selectedOption.description}` : ""}`
						: placeholder}
				</span>
				<svg
					className={`w-4 h-4 shrink-0 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
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
					className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto scrollbar-thin bg-bg-muted border border-border rounded-[var(--radius-none)] shadow-lg"
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
									{option.description !== undefined && (
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
	/** Keyboard event handler (for inline editing scenarios) */
	onKeyDown?: (event: React.KeyboardEvent) => void;
	/** Name attribute for form compatibility */
	name?: string;
	/** Whether the field is required */
	required?: boolean;
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
	onKeyDown,
	name,
	required,
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

	// Handle keyboard events on the trigger button
	const handleButtonKeyDown = (event: React.KeyboardEvent) => {
		// Pass through to external handler if provided
		if (onKeyDown !== undefined) {
			onKeyDown(event);
		}

		// Handle arrow keys to navigate options when open
		if (isOpen) {
			const currentIndex = options.findIndex((o) => o.value === value);
			if (event.key === "ArrowDown") {
				event.preventDefault();
				const nextIndex = Math.min(currentIndex + 1, options.length - 1);
				onChange(options[nextIndex].value);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				const prevIndex = Math.max(currentIndex - 1, 0);
				onChange(options[prevIndex].value);
			}
		} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setIsOpen(true);
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current !== null &&
				// eslint-disable-next-line no-type-assertion/no-type-assertion
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
		if (isOpen && listRef.current !== null && value !== "") {
			const selectedEl = listRef.current.querySelector(
				`[data-value="${value}"]`,
			);
			if (selectedEl !== null) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [isOpen, value]);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				id={id}
				name={name}
				data-required={required}
				onClick={() => {
					if (!disabled) {
						setIsOpen(!isOpen);
					}
				}}
				onKeyDown={handleButtonKeyDown}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className="form-select-trigger flex items-center justify-between gap-2 text-left text-sm"
			>
				<span
					className={selectedOption !== undefined ? "text-fg" : "text-fg-muted"}
				>
					{selectedOption !== undefined
						? `${selectedOption.label}${selectedOption.description !== undefined ? ` — ${selectedOption.description}` : ""}`
						: placeholder}
				</span>
				<svg
					className={`w-4 h-4 shrink-0 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
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
					className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto scrollbar-thin bg-bg-muted border border-border rounded-[var(--radius-none)] shadow-lg"
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
							{option.description !== undefined && (
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
