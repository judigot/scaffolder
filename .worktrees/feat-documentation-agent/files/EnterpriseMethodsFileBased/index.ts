/* Enterprise Methods Index
 * These are advanced features for enterprise applications
 * They should be used alongside BaseMethodsFileBased, not replace them
 */

export const enterpriseMethods = {
  'audit-and-tracking': {
    audit: {
      description: 'Complete audit trail logging for compliance',
      features: ['Change tracking', 'User attribution', 'Metadata logging'],
    },
  },
  'validation-and-security': {
    validate: {
      description: 'Data validation and permission checking',
      features: ['Input sanitization', 'Role-based permissions', 'Security validation'],
    },
  },
  'data-import-export': {
    export: {
      description: 'Data export in multiple formats',
      features: ['CSV/Excel/JSON/PDF export', 'Filtered exports', 'Permission-based access'],
    },
  },
  'bulk-operations': {
    batchCreateWithTransaction: {
      description: 'Enterprise bulk operations with transaction support',
      features: ['Transaction rollback', 'Batch processing', 'Error handling'],
    },
  },
};

export default enterpriseMethods; 