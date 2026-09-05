interface IToggleSwitchProps {
	checked: boolean;
	onChange: () => void;
	disabled?: boolean;
	label?: string;
}

export default function ToggleSwitch({
	checked,
	onChange,
	disabled = false,
	label,
}: IToggleSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={onChange}
			disabled={disabled}
			className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ${
				checked
					? "bg-success-500 border-success-500"
					: "bg-neutral-700 border-neutral-600"
			} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
		>
			<span
				className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
					checked ? "translate-x-6" : "translate-x-1"
				}`}
			/>
		</button>
	);
}
