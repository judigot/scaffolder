import CRUD from './crud/';
import QueryAndSearch from './query-and-search/';
import SoftDeletesAndRestoration from './soft-deletes-and-restoration/';
import BulkOperations from './bulk-operations/';
import RetrievalAndSorting from './retrieval-and-sorting/';
import AdvancedOperations from './advanced-operations/';
export const baseMethods = [
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
