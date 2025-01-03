import { IMethods } from '@/interfaces/IRepositoryPatternStructure.ts';
import { IDomainStatus } from '@/interfaces/IDomainStatus.ts';
export type IDomainStructure = {
  [key in keyof IMethods]: string | ((status: IDomainStatus) => string);
};
