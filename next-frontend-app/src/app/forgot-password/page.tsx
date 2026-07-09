"use client";

import { useState } from "react";
import api from "@/lib/axios";

type FieldErrors = {
    email?: string[];
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setMessage("");
        setIsLoading(true);

        try {
            await api.get("/sanctum/csrf-cookie");
            const res = await api.post("/api/forgot-password", { email });
            setMessage(res.data.message);
        } catch (error: any) {
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ email: ["送信に失敗しました。時間をおいて再度お試しください。"] });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6">パスワードをお忘れの方</h1>

                {message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        <p>{message}</p>
                        <p className="mt-1 text-sm text-center">

                            <a href="http://localhost:8025"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium  text-blue-600"
                            >
                                メールを確認する
                            </a>
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            メールアドレス
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="test@example.com"
                        />
                        {errors.email && (
                            <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? "送信中..." : "リセットリンクを送信"}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    <a href="/login" className="text-blue-600 hover:underline">
                        ログインページに戻る
                    </a>
                </p>
            </div>
        </div>
    );
}
