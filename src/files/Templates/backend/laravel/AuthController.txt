<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\BaseController;

class AuthController extends BaseController
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|string|email|max:100|unique:user', // Make sure to match your table name here
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Create the user and hash the password
        $user = User::create([
            'first_name' => $validatedData['first_name'],
            'last_name' => $validatedData['last_name'],
            'email' => $validatedData['email'],
            'password_hash' => Hash::make($validatedData['password']), // Hash the password correctly
            'phone_number' => $request->phone_number,
        ]);

        // Load the user types
        $user->load('userTypes');

        // Generate the API token using Passport
        $token = $user->createToken('Personal Access Token')->accessToken;

        return response()->json(['token' => $token, 'user' => $user], 201);
    }

    /**
     * Login user and return the token.
     */
    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        // Attempt authentication
        if (!Auth::attempt($credentials)) {
            $user = User::where('email', $credentials['email'])->first();
            // User does not exist
            if (!$user) {
                return response()->json([
                    'status' => 404,
                    'message' => 'User not found',
                    'error_code' => 'USER_NOT_FOUND'
                ], 404);
            }

            // Invalid password or credentials
            return response()->json([
                'status' => 401,
                'message' => 'Invalid credentials',
                'error_code' => 'INVALID_CREDENTIALS'
            ], 401);
        }

        $user = Auth::user();
        $user->load('userTypes');

        $token = $user->createToken('Personal Access Token')->accessToken;
        return response()->json([
            'user' => $user,
            'accessToken' => $token,
        ], 200);
    }


    /**
     * Logout user (revoke the token).
     */
    public function logout(Request $request)
    {
        // Revoke the user's token
        $request->user()->token()->revoke();

        return response()->json(['message' => 'Successfully logged out'], 200);
    }

    /**
     * Get the authenticated user's details.
     */
    public function authorize(Request $request)
    {
        $user = $request->user();
        $user->load('userTypes'); // Eager load user types

        // Return the authenticated user's information
        return response()->json($user);
    }

    /**
     * Get the authenticated user's details.
     */
    public function user(Request $request)
    {
        $user = $request->user();
        $user->load('userTypes'); // Eager load user types

        // Return the authenticated user's information
        return response()->json($user);
    }

    /**
     * Super-Admin-specific access.
     */
    public function superadmin()
    {
        return response()->json(['message' => 'Super Admin Access']);
    }

    /**
     * Admin-specific access.
     */
    public function admin()
    {
        return response()->json(['message' => 'Admin Access']);
    }

    /**
     * User-specific access.
     */
    public function user()
    {
        return response()->json(['message' => 'User Access']);
    }
}
