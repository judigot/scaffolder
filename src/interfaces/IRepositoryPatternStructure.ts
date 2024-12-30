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

export interface IMethods {
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

export interface IRelationshipStructure
  extends IMethods,
    Omit<IRepositoryStructure, 'methods'> {
  childRepositoryMethod: string;
  childRepositoryContent: string;
  childServiceMethod: string;
  childServiceContent: string;
  childControllerMethod: string;
  childControllerContent: string;
}
