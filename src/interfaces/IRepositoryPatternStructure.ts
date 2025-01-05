import { IDomainStatus } from '@/interfaces/IDomainStatus.ts';

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

type DomainMethodGroups = 'Domain Relations';

export interface IMethods {
  methodName: string;
  route: string;
  description: string;
  modelMethod?: string;
  modelContent?: string;
  repositoryMethod: string;
  repositoryContent: string;
  serviceMethod: string;
  serviceContent: string;
  controllerMethod: string;
  controllerContent: string;
}

export interface IRepositoryStructure {
  group: MethodGroups | RelationshipMethodGroups | DomainMethodGroups;
  methods: IMethods[];
}

export interface IDomainStructure {
  group: MethodGroups | RelationshipMethodGroups | DomainMethodGroups;
  methods: {
    [key in keyof IMethods]: string | ((status: IDomainStatus) => string);
  }[];
}
