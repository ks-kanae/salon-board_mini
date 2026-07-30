<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class GetAvailabilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'salon_id' => ['required', 'exists:salons,id'],
            'date' => ['required', 'date'],
            'duration' => ['required', 'integer', 'min:1'],
            'menu_ids' => ['required', 'array'],
            'menu_ids.*' => ['exists:menus,id'],
        ];
    }
}
