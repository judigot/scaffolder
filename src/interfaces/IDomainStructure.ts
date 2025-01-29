import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import { IDomainStatus } from '@/interfaces/IDomainStatus.ts';
export type IDomainStructure = {
  [key in keyof IMethod]: string | ((status: IDomainStatus) => string);
};
