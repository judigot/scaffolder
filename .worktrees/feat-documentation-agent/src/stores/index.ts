/**
 * Zustand Stores
 *
 * Domain-specific stores for the application:
 *
 * - useScaffolderStore: Scaffolder tab state (files, projects, build cache)
 * - useRepositoriesStore: Repositories tab state (repos, chats, sprints)
 *
 * Legacy stores (to be migrated/deprecated):
 * - useUIStore: Global navigation state
 * - useFormStore: Database connection settings
 * - useTransformationsStore: Schema transformations
 * - useMockDatabaseStore: User files (migrating to useScaffolderStore)
 * - useProjectStore: Projects (migrating to useScaffolderStore)
 * - useSchemaStore: Schema selection
 */

export {
	type ChatScope,
	useRepositoriesStore,
} from "./useRepositoriesStore.ts";
export {
	type IScaffolderStore,
	useScaffolderStore,
} from "./useScaffolderStore.ts";
