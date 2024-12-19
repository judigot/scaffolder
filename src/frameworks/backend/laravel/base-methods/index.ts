import { IRepositoryPatternStructure } from '@/interfaces/IRepositoryPatternStructure';
import AdvancedOperations from './AdvancedOperations';
import BulkOperations from './BulkOperations';
import CRUDOperations from './CRUDOperations';
import QueryAndSearch from './QueryAndSearch';
import RetrievalAndSorting from './RetrievalAndSorting';
import SoftDeletesAndRestoration from './SoftDeletesAndRestoration';

const baseMethods: IRepositoryPatternStructure[] = [
  { ...CRUDOperations },
  { ...QueryAndSearch },
  { ...SoftDeletesAndRestoration },
  { ...BulkOperations },
  { ...RetrievalAndSorting },
  { ...AdvancedOperations },
];

export default baseMethods;
