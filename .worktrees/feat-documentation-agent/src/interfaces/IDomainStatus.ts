export interface IDomainStatus {
  belongsTo: boolean;
  hasOne: boolean;
  hasMany: boolean;
  pivotRelationships: boolean;
  isOneToOne: boolean;
  isOneToMany: boolean;
  isManyToMany: boolean;
  isBelongsTo: boolean;
  isBelongsToMany: boolean;
  isPivot: boolean;
}
