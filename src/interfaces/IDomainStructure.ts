import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import type { IDomainStatus } from '@/interfaces/IDomainStatus.ts';
export type IDomainStructure = {
  [key in keyof IMethod]: string | ((status: IDomainStatus) => string);
};
