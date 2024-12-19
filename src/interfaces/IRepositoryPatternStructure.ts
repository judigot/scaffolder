type MethodGroups =
  | 'CRUD'
  | 'Query and Search'
  | 'Soft Deletes and Restoration'
  | 'Bulk Operations'
  | 'Retrieval and Sorting'
  | 'Advanced Operations';

export interface IRepositoryStructure {
  group: MethodGroups;
  methods: {
    route: string;
    description: string;
    repositoryMethod: string;
    repositoryContent: string;
    serviceMethod: string;
    serviceContent: string;
    controllerMethod: string;
    controllerContent: string;
  }[];
}
