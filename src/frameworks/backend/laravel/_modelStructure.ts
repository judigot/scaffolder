export default {
  modelTemplate: `
<?php

namespace App\\Models;

{{modelImports}}
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class {{className}} extends Model
{
    use HasFactory;

    protected $table = '{{tableName}}';

    {{primaryKey}}

    {{hiddenColumns}}

    protected $fillable = [
        {{fillable}}
    ];

    {{domainMethods}}
}`,
  hasOne: `public function {{relationshipName}}()
    {
        return $this->hasOne({{relatedModel}}::class, '{{foreignKey}}');
    }`,
  hasMany: `public function {{relationshipName}}s()
    {
        return $this->hasMany({{relatedModel}}::class, '{{foreignKey}}');
    }`,
  belongsTo: `public function {{relationshipName}}()
    {
        return $this->belongsTo({{relatedModel}}::class, '{{foreignKey}}');
    }`,
  belongsToMany: `public function {{relationshipName}}s()
    {
        return $this->belongsToMany({{relatedModel}}::class, '{{pivotTable}}', '{{primaryKey}}', '{{relatedTableForeignKey}}');
    }`,

  // New
  timestamps: `protected $timestamps = {{useTimestamps}};
    protected $timestampFields = {
        'created_at': '{{createdAtField}}',
        'updated_at': '{{updatedAtField}}'
    }`,
  softDelete: `protected $softDelete = {{useSoftDelete}};
    protected $deleteField = '{{deleteField}}';`,
  columnDefinition: `{{decorators}}
    {{visibility}} \${{name}}: {{type}}{{nullable}} = {{defaultValue}};`,
  validationRules: `protected static $rules = {
        {{rules}}
    }`,
  indexDefinition: `{{indexType}}('{{name}}', {
        columns: [{{columns}}],
        unique: {{isUnique}}
    })`,
  metadata: `protected $metadata = [
        'table' => '{{tableName}}',
        'schema' => '{{schemaName}}',
        'connection' => '{{connectionName}}',
        'primaryKey' => '{{primaryKeyName}}'
    ];`,
  columnTypes: {
    string: 'string',
    number: 'integer',
    decimal: 'decimal',
    boolean: 'boolean',
    date: 'datetime',
    json: 'json',
    enum: 'enum',
    uuid: 'uuid',
  },
  attributes: `protected $attributes = [
        {{defaults}}
    ];`,
  computed: `protected $appends = [
        {{computed}}
    ];`,
};
