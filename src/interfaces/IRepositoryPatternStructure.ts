type MethodGroups =
  | 'CRUD'
  | 'Query and Search'
  | 'Soft Deletes and Restoration'
  | 'Bulk Operations'
  | 'Retrieval and Sorting'
  | 'Advanced Operations';

type RelationshipMethodGroups =
  | 'One-to-One Relationship'
  | 'One-to-Many Relationship'
  | 'Many-to-Many Relationship';

interface IMethods {
  methodName: string;
  route: string;
  description: string;
  repositoryMethod: string;
  repositoryContent: string;
  serviceMethod: string;
  serviceContent: string;
  controllerMethod: string;
  controllerContent: string;
}

export interface IRepositoryStructure {
  group: MethodGroups | RelationshipMethodGroups;
  methods: IMethods[];
}
