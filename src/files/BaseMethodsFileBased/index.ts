import type { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
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
