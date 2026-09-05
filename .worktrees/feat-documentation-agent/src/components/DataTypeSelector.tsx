import type React from "react";
import GroupedSelect from "@/components/UI/GroupedSelect.tsx";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { isRecord } from "@/utils/typeGuards.ts";

interface IDataTypeSelectorProps {
	value: string;
	onChange: (value: string) => void;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	className?: string;
	id?: string;
	name?: string;
	required?: boolean;
}

// Helper function to safely get database-specific type
const getDbSpecificType = (typeMapping: unknown, dbType: string): string => {
	if (isRecord(typeMapping) && dbType in typeMapping) {
		const dbTypeValue = typeMapping[dbType];
		if (typeof dbTypeValue === "string") {
			return dbTypeValue;
		}
	}
	return "";
};

const DataTypeSelector: React.FC<IDataTypeSelectorProps> = ({
	value,
	onChange,
	onKeyDown,
	className = "",
	id,
	name: _name,
	required: _required = false,
}) => {
	const { typeMappings } = useMockDatabaseStore();
	const { dbType } = useFormStore();

	// Get available data types grouped by their info.group value
	const getGroupedDataTypeOptions = () => {
		if (typeMappings && dbType) {
			const groups: Record<string, { value: string; label: string }[]> = {};

			Object.keys(typeMappings).forEach((key) => {
				const typeMapping = typeMappings[key];
				let groupName = "Other";

				// Check if typeMapping has info.group with proper type checking
				if (
					typeMapping !== null &&
					typeof typeMapping === "object" &&
					"info" in typeMapping &&
					typeMapping.info !== null &&
					typeof typeMapping.info === "object" &&
					"group" in typeMapping.info &&
					typeof typeMapping.info.group === "string"
				) {
					groupName = typeMapping.info.group;
				}

				// Get the database-specific type
				const dbSpecificType = getDbSpecificType(typeMapping, dbType);

				if (!(groupName in groups)) {
					groups[groupName] = [];
				}

				// Create label with database-specific type
				const label = dbSpecificType ? `${key} - ${dbSpecificType}` : key;

				groups[groupName].push({
					value: key,
					label,
				});
			});

			return groups;
		}

		// Fallback to ungrouped options if typeMappings is not available
		return {
			"Basic Types": [
				{ value: "string", label: "string" },
				{ value: "number", label: "number" },
				{ value: "float", label: "float" },
				{ value: "Date", label: "Date" },
				{ value: "boolean", label: "boolean" },
			],
		};
	};

	const groupedOptions = getGroupedDataTypeOptions();

	// Convert grouped options to GroupedSelect format
	const groups = Object.entries(groupedOptions).map(([groupName, options]) => ({
		label: groupName,
		options: options.map((option) => {
			// Split the label to identify the database type part
			const parts = option.label.split(" - ");
			const hasDbType = parts.length > 1;

			if (hasDbType) {
				const typeName = parts[0];
				const typeDbType = parts[1];
				return {
					value: option.value,
					label: typeName,
					description: typeDbType,
				};
			}

			return {
				value: option.value,
				label: option.label,
			};
		}),
	}));

	return (
		<GroupedSelect
			id={id}
			value={value}
			onChange={onChange}
			onKeyDown={onKeyDown}
			groups={groups}
			className={className}
			aria-label="Data type"
		/>
	);
};

export default DataTypeSelector;
