<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->role === 'customer';
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
            'menu_ids' => ['required', 'array', 'min:1'],
            'menu_ids.*' => ['exists:menus,id'],
            'start_at' => ['required', 'date', 'after_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:500'],
            'preferred_staff_id' => ['nullable', 'exists:users,id'],
            'is_nominated' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_at.after_or_equal' => '予約日時は現在以降の日時を選択してください。',
        ];
    }
}
