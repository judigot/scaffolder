export default {
  group: 'One-to-One Relationship',
  methods: [
    {
      repositoryMethod:
        'get{{pascalCaseSingular}}(int {{camelCaseSingular}}_id): ?{{relatedModelName}}',
      repositoryContent: `
        return $this->model->find({{ camelCaseSingular }}_id)?->{{camelCaseSingular}};
      `,
      serviceMethod:
        'get{{pascalCaseSingular}}(int {{camelCaseSingular}}_id): ?{{relatedModelName}}',
      serviceContent: `
        return $this->repository->get{{pascalCaseSingular}}({{ camelCaseSingular }}_id);
      `,
      controllerMethod:
        'get{{pascalCaseSingular}}(Request $request, int {{camelCaseSingular}}_id)',
      controllerContent: `
        {{ camelCaseSingular }} = $this->service->get{{pascalCaseSingular}}({{ camelCaseSingular }}_id);
        return response()->json({{ camelCaseSingular }});
      `,
    },
  ],
};
