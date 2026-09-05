import type { ISchemaInfo } from "@/interfaces/interfaces.ts";

interface ISchemaPreviewProps {
	schema: ISchemaInfo[];
}

/**
 * Read-only preview component for displaying generated schema in chat messages
 */
export default function SchemaPreview({ schema }: ISchemaPreviewProps) {
	if (schema.length === 0) {
		return null;
	}

	return (
		<div className="mt-4 space-y-3">
			<div className="flex items-center gap-2 text-sm text-fg-muted">
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<title>Database schema</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
					/>
				</svg>
				<span className="font-medium">Generated Schema</span>
				<span className="text-xs bg-primary-900/40 text-primary-300 px-2 py-0.5 rounded-full">
					{schema.length} {schema.length === 1 ? "table" : "tables"}
				</span>
			</div>

			<div className="grid gap-2">
				{schema.map((table) => (
					<TableCard key={table.tableName} table={table} allTables={schema} />
				))}
			</div>
		</div>
	);
}

interface ITableCardProps {
	table: ISchemaInfo;
	allTables: ISchemaInfo[];
}

function TableCard({ table, allTables }: ITableCardProps) {
	const relationships = getRelationships(table, allTables);

	return (
		<div className="bg-secondary/50 border border-border rounded-lg overflow-hidden">
			{/* Table header */}
			<div className="px-3 py-2 bg-secondary border-b border-border flex items-center gap-2">
				<svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<title>Table</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				<span className="font-mono font-semibold text-sm text-fg">{table.tableName}</span>
				{table.isPivot === true && (
					<span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">pivot</span>
				)}
			</div>

			{/* Columns */}
			<div className="px-3 py-2 space-y-1">
				{table.columnsInfo.map((col) => (
					<div key={col.column_name} className="flex items-center gap-2 text-xs">
						{/* Column name */}
						<span className="font-mono text-fg-muted w-32 truncate" title={col.column_name}>
							{col.column_name}
						</span>

						{/* Data type */}
						<span className="font-mono text-fg-subtle w-16 truncate" title={col.data_type}>
							{col.data_type}
						</span>

						{/* Badges */}
						<div className="flex gap-1 flex-wrap">
							{col.primary_key === true && (
								<span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-1 rounded">PK</span>
							)}
							{col.unique === true && (
								<span className="text-[10px] bg-blue-900/40 text-blue-300 px-1 rounded">UQ</span>
							)}
							{col.foreign_key !== undefined && (
								<span className="text-[10px] bg-green-900/40 text-green-300 px-1 rounded" title={`FK → ${col.foreign_key.foreign_table_name}.${col.foreign_key.foreign_column_name}`}>
									FK
								</span>
							)}
							{col.is_nullable === "NO" && col.primary_key !== true && (
								<span className="text-[10px] bg-red-900/40 text-red-300 px-1 rounded">REQ</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Relationships */}
			{relationships.length > 0 && (
				<div className="px-3 py-2 border-t border-border bg-bg/30">
					<div className="flex flex-wrap gap-1.5">
						{relationships.map((rel, idx) => (
							<span
								key={`${rel.type}-${rel.target}-${String(idx)}`}
								className="text-[10px] text-fg-subtle"
							>
								<span className="text-fg-muted">{rel.type}</span>
								<span className="mx-1">→</span>
								<span className="font-mono text-fg-muted">{rel.target}</span>
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

interface IRelationship {
	type: string;
	target: string;
}

function getRelationships(table: ISchemaInfo, _allTables: ISchemaInfo[]): IRelationship[] {
	const relationships: IRelationship[] = [];

	if (table.hasOne !== undefined) {
		for (const target of table.hasOne) {
			relationships.push({ type: "hasOne", target });
		}
	}

	if (table.hasMany !== undefined) {
		for (const target of table.hasMany) {
			relationships.push({ type: "hasMany", target });
		}
	}

	if (table.belongsTo !== undefined) {
		for (const target of table.belongsTo) {
			relationships.push({ type: "belongsTo", target });
		}
	}

	if (table.belongsToMany !== undefined) {
		for (const target of table.belongsToMany) {
			relationships.push({ type: "belongsToMany", target });
		}
	}

	return relationships;
}
