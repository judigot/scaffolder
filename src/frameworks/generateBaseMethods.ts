import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { methods } from "@/frameworks/backend/laravel/base-methods/index.ts";
import type { IRepositoryStructure } from "@/interfaces/IRepositoryPatternStructure.ts";
import { changeCase } from "@/utils/common.ts";

// Convert `import.meta.url` to a file path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, "../../files/BaseMethodsFileBased"); // Ensures files are created in the same directory

if (fs.existsSync(outputDir)) {
	fs.rmdirSync(outputDir, { recursive: true });
	// eslint-disable-next-line no-console
	console.log(`✅ Deleted: ${outputDir}`);
}

// Generate index.ts for a specific group directory
const generateGroupIndexFile = (groupDir: string, methods: string[]) => {
	const imports = methods
		.map((method) => `import ${method} from './${method}/index.ts';`)
		.join("\n");

	const exports = `export default [
${methods.map((method) => `  ${method},`).join("\n")}
] satisfies IMethod[];`;

	const indexContent = `import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
${imports}\n\n${exports}\n`;
	const indexPath = path.join(groupDir, "index.ts");
	fs.writeFileSync(indexPath, indexContent, "utf8");
	// eslint-disable-next-line no-console
	console.log(`✅ Created: ${indexPath}`);
};

const generateFeatureFiles = (operation: IRepositoryStructure[]) => {
	// Track methods by group for generating group index files
	const methodsByGroup = new Map<string, string[]>();

	operation.forEach(({ group, methods }) => {
		const groupDirName = changeCase(group).kebabCase;
		const groupDir = path.join(outputDir, groupDirName);

		// Initialize group methods array if not exists
		if (!methodsByGroup.has(groupDirName)) {
			methodsByGroup.set(groupDirName, []);
		}

		methods.forEach((method) => {
			const featureDir = path.join(groupDir, method.methodName);

			// Ensure the feature directory exists
			if (!fs.existsSync(featureDir)) {
				fs.mkdirSync(featureDir, { recursive: true });
			}

			// Track method for group index
			methodsByGroup.get(groupDirName)?.push(method.methodName);

			// Create individual .txt files for each property
			const properties = [
				{ name: "methodName", value: method.methodName },
				{ name: "route", value: method.route },
				{ name: "description", value: method.description },
				{ name: "repositoryMethod", value: method.repositoryMethod },
				{ name: "repositoryContent", value: method.repositoryContent },
				{ name: "serviceMethod", value: method.serviceMethod },
				{ name: "serviceContent", value: method.serviceContent },
				{ name: "controllerMethod", value: method.controllerMethod },
				{ name: "controllerContent", value: method.controllerContent },
			];

			// Write each property to its own .txt file
			properties.forEach((prop) => {
				const filePath = path.join(featureDir, `${prop.name}.txt`);
				fs.writeFileSync(filePath, prop.value, "utf8");
				// eslint-disable-next-line no-console
				console.log(`✅ Created: ${filePath}`);
			});

			// Create an index.ts file that loads all the txt files
			const indexContent = `import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));

export default {
  methodName: fs.readFileSync(path.join(currentDir, 'methodName.txt'), 'utf8'),
  route: fs.readFileSync(path.join(currentDir, 'route.txt'), 'utf8'),
  description: fs.readFileSync(path.join(currentDir, 'description.txt'), 'utf8'),
  repositoryMethod: fs.readFileSync(path.join(currentDir, 'repositoryMethod.txt'), 'utf8'),
  repositoryContent: fs.readFileSync(path.join(currentDir, 'repositoryContent.txt'), 'utf8'),
  serviceMethod: fs.readFileSync(path.join(currentDir, 'serviceMethod.txt'), 'utf8'),
  serviceContent: fs.readFileSync(path.join(currentDir, 'serviceContent.txt'), 'utf8'),
  controllerMethod: fs.readFileSync(path.join(currentDir, 'controllerMethod.txt'), 'utf8'),
  controllerContent: fs.readFileSync(path.join(currentDir, 'controllerContent.txt'), 'utf8'),
} satisfies IMethod;
`;

			fs.writeFileSync(path.join(featureDir, "index.ts"), indexContent, "utf8");
			// eslint-disable-next-line no-console
			console.log(`✅ Created: ${path.join(featureDir, "index.ts")}`);
		});
	});

	// Generate index.ts for each group
	methodsByGroup.forEach((methods, groupDirName) => {
		const groupDir = path.join(outputDir, groupDirName);
		generateGroupIndexFile(groupDir, methods);
	});

	// Generate main index.ts
	generateIndexFile(outputDir);
};

// Generate `index.ts` that dynamically imports all method index files
const generateIndexFile = (outputDir: string) => {
	// Generate the base methods array
	const indexContent = `import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
import CRUD from './crud/index.ts';
import QueryAndSearch from './query-and-search/index.ts';
import SoftDeletesAndRestoration from './soft-deletes-and-restoration/index.ts';
import BulkOperations from './bulk-operations/index.ts';
import RetrievalAndSorting from './retrieval-and-sorting/index.ts';
import AdvancedOperations from './advanced-operations/index.ts';

export const baseMethods: IRepositoryStructure[] = [
  { group: 'CRUD', methods: CRUD },
  { group: 'Query and Search', methods: QueryAndSearch },
  {
    group: 'Soft Deletes and Restoration',
    methods: SoftDeletesAndRestoration,
  },
  { group: 'Bulk Operations', methods: BulkOperations },
  { group: 'Retrieval and Sorting', methods: RetrievalAndSorting },
  { group: 'Advanced Operations', methods: AdvancedOperations },
];

export default baseMethods;
`;

	fs.writeFileSync(path.join(outputDir, "index.ts"), indexContent, "utf8");
	// eslint-disable-next-line no-console
	console.log(`✅ Created: ${path.join(outputDir, "index.ts")}`);
};

// Run the generator
generateFeatureFiles(methods);
