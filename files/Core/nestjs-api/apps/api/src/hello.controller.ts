import { Controller, Get } from '@nestjs/common';
import type { IHelloResponse } from '@bigbang/api-client';

@Controller()
export class HelloController {
  @Get('hello')
  hello(): IHelloResponse {
    const response: IHelloResponse = { message: 'Hello, world!' };
    return response;
  }
}
