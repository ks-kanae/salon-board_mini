"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import api from "@/lib/axios";

type User = {
    id: number;
    name: string;
    email: string;
};

type RegisterPayload = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await api.get<User>("/api/user");
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = async (email: string, password: string) => {
        await api.get("/sanctum/csrf-cookie");
        await api.post("/api/login", { email, password });
        await fetchUser();
    };

    const register = async (payload: RegisterPayload) => {
        await api.get("/sanctum/csrf-cookie");
        await api.post("/api/register", payload);
        await fetchUser();
    };

    const logout = async () => {
        await api.post("/api/logout");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
