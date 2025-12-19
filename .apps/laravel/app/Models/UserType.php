<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserType extends Model
{
    use SoftDeletes;

    protected $fillable = ['name'];

    /**
     * The users that belong to this user type.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_user_type', 'user_type_id', 'user_id')->withTimestamps();
    }
}
