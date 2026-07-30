"use client";

import { useEffect } from "react";

type Props = {
    message: string;
    onClose: () => void;
    duration?: number;
};

export default function Toast({ message, onClose, duration = 2000 }: Props) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4">
            <div className="px-6 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 bg-red-500">
                <span>⚠️</span>
                <span>{message}</span>
                <button onClick={onClose} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
            </div>
        </div>
    );
}
