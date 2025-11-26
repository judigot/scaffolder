import AdvancedOperations from './AdvancedOperations';
import BulkOperations from './BulkOperations';
import CRUD from './CRUD';
import QueryAndSearch from './QueryAndSearch';
import RetrievalAndSorting from './RetrievalAndSorting';
import SoftDeletesAndRestoration from './SoftDeletesAndRestoration';
const baseMethods = [
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
