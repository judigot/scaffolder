export interface IRepositoryPatternStructure {
  group: string;
  methods: {
    route: string;
    repositoryMethod: string;
    repositoryContent: string;
    serviceMethod: string;
    serviceContent: string;
    controllerMethod: string;
    controllerContent: string;
  }[];
}
