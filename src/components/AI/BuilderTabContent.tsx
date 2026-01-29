import { Build as BuildIcon, ExpandMore } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { CREATION_MODES } from "@/constants.ts";
import { useFormStore } from "@/useFormStore.ts";

type CreationMode = (typeof CREATION_MODES)[keyof typeof CREATION_MODES];

const MODE_OPTIONS: Array<{ value: CreationMode; label: string }> = [
	{ value: CREATION_MODES.JUDAS, label: "Judas AI" },
	{ value: CREATION_MODES.SCHEMA_BUILDER, label: "Schema Builder" },
	{ value: CREATION_MODES.INTROSPECTOR, label: "Introspector" },
];

interface IBuildTabContentProps {
	/** Whether this tab is currently active */
	isActive: boolean;
}

/**
 * Custom content for the Builder tab in scaffolder mode.
 * Shows a dropdown to select between Judas AI, Schema Builder, and Introspector.
 */
export default function BuilderTabContent({ isActive }: IBuildTabContentProps) {
	const { creationMode, setCreationMode } = useFormStore();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const selectedOption = MODE_OPTIONS.find((o) => o.value === creationMode);

	const handleSelect = useCallback(
		(value: CreationMode) => {
			setCreationMode(value);
			setIsOpen(false);
		},
		[setCreationMode],
	);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Close on escape
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div ref={containerRef} className="relative flex flex-col items-center">
			<BuildIcon className="w-5 h-5 mb-1" />
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen(!isOpen);
				}}
				className={`flex items-center gap-0.5 text-xs font-medium transition-colors ${
					isActive ? "text-content" : "text-fg-muted hover:text-content"
				}`}
			>
				<span>{selectedOption?.label ?? "Builder"}</span>
				<ExpandMore
					className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{/* Dropdown menu */}
			{isOpen && (
				<div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-secondary border border-layout-border rounded-md shadow-lg z-50 min-w-[140px] overflow-hidden">
					{MODE_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleSelect(option.value);
							}}
							className={`w-full px-3 py-2 text-left text-xs transition-colors ${
								option.value === creationMode
									? "bg-accent text-accent-fg"
									: "text-fg-muted hover:bg-secondary-hover hover:text-content"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
