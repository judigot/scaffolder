import { CREATION_MODES } from "@/constants.ts";
import { useFormStore } from "@/useFormStore.ts";

type CreationMode = (typeof CREATION_MODES)[keyof typeof CREATION_MODES];

const MODE_OPTIONS: Array<{ value: CreationMode; label: string }> = [
	{ value: CREATION_MODES.JUDAS, label: "Judas AI" },
	{ value: CREATION_MODES.SCHEMA_BUILDER, label: "Schema Builder" },
	{ value: CREATION_MODES.INTROSPECTOR, label: "Introspector" },
];

/**
 * Mode selector for the Builder tab content area.
 * Centered horizontal tabs to switch between Judas AI, Schema Builder, and Introspector.
 */
export default function BuilderModeSelector() {
	const { creationMode, setCreationMode } = useFormStore();

	return (
		<div className="flex justify-center py-3 border-b border-border bg-secondary">
			<div className="inline-flex bg-bg rounded-lg p-1 gap-1">
				{MODE_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => setCreationMode(option.value)}
						className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
							option.value === creationMode
								? "bg-accent text-accent-fg shadow-sm"
								: "text-fg-muted hover:text-content hover:bg-secondary-hover"
						}`}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}
