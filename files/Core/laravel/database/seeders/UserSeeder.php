<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserType;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create user types
        $superadmin = UserType::create(['name' => 'superadmin']);
        $admin = UserType::create(['name' => 'admin']);
        $user = UserType::create(['name' => 'user']);

        // Create John Smith (superadmin)
        $john = User::create([
            'name' => 'John Smith',
            'email' => 'johnsmith@example.com',
            'password' => bcrypt('123')
        ]);
        $john->userTypes()->attach($superadmin->id);

        // Create John Doe (admin)
        $john = User::create([
            'name' => 'John Doe',
            'email' => 'johndoe@example.com',
            'password' => bcrypt('123')
        ]);
        $john->userTypes()->attach($admin->id);

        // Create Jane Doe (user)
        $jane = User::create([
            'name' => 'Jane Doe',
            'email' => 'janedoe@example.com',
            'password' => bcrypt('123')
        ]);
        $jane->userTypes()->attach($user->id);
    }
}
