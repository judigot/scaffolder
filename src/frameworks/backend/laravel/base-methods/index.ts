import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure';
import AdvancedOperations from './AdvancedOperations';
import BulkOperations from './BulkOperations';
import CRUD from './CRUD';
import QueryAndSearch from './QueryAndSearch';
import RetrievalAndSorting from './RetrievalAndSorting';
import SoftDeletesAndRestoration from './SoftDeletesAndRestoration';

const baseMethods: IRepositoryStructure[] = [
  { ...CRUD },
  { ...QueryAndSearch },
  { ...SoftDeletesAndRestoration },
  { ...BulkOperations },
  { ...RetrievalAndSorting },
  { ...AdvancedOperations },
];

export default baseMethods;
