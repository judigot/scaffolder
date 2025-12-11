<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Passport\HasApiTokens; // Used by laravel passport

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /** @use HasFactory<\Database\Factories\UserFactory> */
    
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * The user can have multiple user types (roles).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function userTypes()
    {
        return $this->belongsToMany(UserType::class, 'user_user_type', 'user_id', 'user_type_id')->withTimestamps();
    }
}
