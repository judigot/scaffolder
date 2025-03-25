<?php

namespace App\Models;

[[ ITERATE(hasOne, hasMany, belongsTo, belongsToMany, pivotRelationships.pivotTable) --removeDuplicates --template="use App\Models\{{valuePascalCaseSingular}};" --separator="\n" ]]
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class {{tableNamePascalCase}} extends Model
{
    use HasFactory;

    protected $table = '{{tableName}}';

    protected $primaryKey = '{{getPrimaryKey()}}';

    protected $hidden = [
        [[ ITERATE({{getAllColumns()}}) --template="'{{value}}'" --separator=",\n        " --filter="[[ USE_CONSTANT(hiddenColumns) ]]" ]]
    ];

    protected $fillable = [
        [[ ITERATE(requiredColumns) --template="'{{value}}'" --separator=",\n        " --ignore="[[ USE_CONSTANT(fillableExemptions) ]]" ]]
    ];

    [[ ITERATE(hasOne) --template="public function {{valueSingular}}() {
    return $this->hasOne({{valuePascalCaseSingular}}::class);
    }" --separator="\n\n" ]]

    [[ ITERATE(hasMany) --template="public function {{valuePlural}}() {
        return $this->hasMany({{valuePascalCaseSingular}}::class);
    }" --separator="\n\n" ]]

    [[ ITERATE(pivotRelationships.relatedTable) --template="public function {{valuePlural}}() {
        return $this->belongsToMany({{valuePascalCaseSingular}}::class);
    }" --separator="\n\n" ]]

    [[ ITERATE(belongsTo) --template="public function {{valueSingular}}() {
        return $this->belongsTo({{valuePascalCaseSingular}}::class);
    }" --separator="\n\n" ]]

}
