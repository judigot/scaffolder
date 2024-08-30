export const APP_SETTINGS = {
  onDeleteCascade: false,
  excludePivotTableFiles: true,
} as const;

export const frameworkDirectories: Record<
  string,
  {
    routes: string;
    resource: string;
    service: string;
    controller: string;
    repository: string;
    interface: string;
    model: string;
    dto: string;
    validation: string;
    exception: string;
  }
> = {
  spring_boot: {
    routes: 'routes/api.php',
    resource: '',
    service: 'src/main/java/com/example/demo/service/user_service.java',
    controller:
      'src/main/java/com/example/demo/controller/user_controller.java',
    repository:
      'src/main/java/com/example/demo/repository/user_repository.java',
    interface: 'src/main/java/com/example/demo/service/i_user_service.java',
    model: 'src/main/java/com/example/demo/model/user.java',
    dto: 'src/main/java/com/example/demo/dto/user_dto.java',
    validation: 'src/main/java/com/example/demo/validation/user_validator.java',
    exception:
      'src/main/java/com/example/demo/exception/global_exception_handler.java',
  },
  laravel: {
    routes: 'routes/api.php',
    resource: 'app/Http/Resources',
    service: 'app/Services',
    controller: 'app/Http/Controllers',
    repository: 'app/Repositories',
    interface: 'app/Repositories',
    model: 'app/Models',
    dto: 'app/Http/Requests',
    validation: 'app/Http/Requests',
    exception: 'app/Exceptions',
  },
  django: {
    routes: 'routes/api.php',
    resource: '',
    service: 'app/services/user_service.py',
    controller: 'app/views/user_view.py',
    repository: 'app/repositories/user_repository.py',
    interface: 'app/interfaces/user_interface.py',
    model: 'app/models/user.py',
    dto: 'app/dto/user_dto.py',
    validation: 'app/validators/user_validator.py',
    exception: 'app/exceptions/global_exception_handler.py',
  },
  nestjs: {
    routes: 'routes/api.php',
    resource: '',
    service: 'src/user/user_service.ts',
    controller: 'src/user/user_controller.ts',
    repository: 'src/user/user_repository.ts',
    interface: 'src/user/interfaces/user_interface.ts',
    model: 'src/user/user_entity.ts',
    dto: 'src/user/dto/user_dto.ts',
    validation: 'src/user/validators/user_validator.ts',
    exception: 'src/exceptions/global_exception_handler.ts',
  },
  ruby_on_rails: {
    routes: 'routes/api.php',
    resource: '',
    service: 'app/services/user_service.rb',
    controller: 'app/controllers/users_controller.rb',
    repository: 'app/repositories/user_repository.rb',
    interface: 'app/interfaces/user_interface.rb',
    model: 'app/models/user.rb',
    dto: 'app/dto/user_dto.rb',
    validation: 'app/validators/user_validator.rb',
    exception: 'app/exceptions/global_exception_handler.rb',
  },
} as const;

export const frontendDirectories = {
  apiCalls: 'src/api',
  component: 'src/components',
  interface: 'src/interface',
  typeGuard: 'src/typeGuards',
} as const;
