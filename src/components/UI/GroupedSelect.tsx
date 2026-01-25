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
	return (
		<select
			id={id}
			value={value}
			onChange={(e) => { onChange(e.target.value); }}
			disabled={disabled}
			aria-label={ariaLabel}
			className={`w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none bg-no-repeat bg-right pr-8 ${className}`}
			style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
				backgroundSize: "1.25rem",
				backgroundPosition: "right 0.5rem center",
			}}
		>
			{value === "" && (
				<option value="" disabled>
					{placeholder}
				</option>
			)}
			{groups.map((group) => (
				<optgroup key={group.label} label={group.label}>
					{group.options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
							{option.description ? ` — ${option.description}` : ""}
						</option>
					))}
				</optgroup>
			))}
		</select>
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
	return (
		<select
			id={id}
			value={value}
			onChange={(e) => { onChange(e.target.value); }}
			disabled={disabled}
			aria-label={ariaLabel}
			className={`w-full px-3 py-2 bg-bg-muted border border-border rounded-md text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none bg-no-repeat bg-right pr-8 ${className}`}
			style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
				backgroundSize: "1.25rem",
				backgroundPosition: "right 0.5rem center",
			}}
		>
			{value === "" && (
				<option value="" disabled>
					{placeholder}
				</option>
			)}
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
					{option.description ? ` — ${option.description}` : ""}
				</option>
			))}
		</select>
	);
}
