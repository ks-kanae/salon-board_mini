<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateSkillsRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class StaffMemberController extends Controller
{
    public function index()
    {
        return response()->json(
            User::where('role', 'staff')
                ->where('salon_id', Auth::user()->salon_id)
                ->get(['id', 'name', 'skills'])
        );
    }

    public function updateSkills(UpdateSkillsRequest $request, User $user)
    {
        $user->update(['skills' => $request->skills ?? []]);
        return response()->json($user);
    }
}
