import type { IRouteContext } from './types.ts';

export const helloHandler = (c: IRouteContext) => {
  return c.json({ message: 'Hello, world!' });
};
