import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';
import AdvancedOperations from './AdvancedOperations.ts';
import BulkOperations from './BulkOperations.ts';
import CRUD from './CRUD.ts';
import QueryAndSearch from './QueryAndSearch.ts';
import RetrievalAndSorting from './RetrievalAndSorting.ts';
import SoftDeletesAndRestoration from './SoftDeletesAndRestoration.ts';

const baseMethods: IRepositoryStructure[] = [
  { ...CRUD },
  { ...QueryAndSearch },
  { ...SoftDeletesAndRestoration },
  { ...BulkOperations },
  { ...RetrievalAndSorting },
  { ...AdvancedOperations },
];

// // Log all methods names from each method group
// baseMethods.forEach(({ methods }) => {
//   methods.forEach(({ methodName }) => {
//     // eslint-disable-next-line no-console
//     console.log(methodName);
//   });
// });

// Log all methods content
export const methods = baseMethods.flatMap((operation) => {
  return operation;
});

export default baseMethods;
