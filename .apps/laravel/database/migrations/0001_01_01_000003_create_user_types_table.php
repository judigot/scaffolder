<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Role name like 'superadmin', 'admin', 'user'
            $table->timestamps();
            $table->softDeletes();  // Add soft deletes
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_types');
    }
};
