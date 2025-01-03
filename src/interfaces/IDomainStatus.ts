export interface IDomainStatus {
  isOneToOne: boolean;
  isOneToMany: boolean;
  isManyToMany: boolean;
  belongsTo: boolean;
  hasOne: boolean;
  hasMany: boolean;
  pivotRelationships: boolean;
  isPivot: boolean;
}
