"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}

export default function ConfirmDeleteModal({
    title,
    description,
    onConfirm,
    onClose,
    loading = false,
}: ConfirmDeleteModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose, loading]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !loading && onClose()}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <div
                className="relative bg-bg-surface rounded-2xl shadow-modal max-w-sm w-full animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-danger" />
                    </div>
                    <h2 className="text-[18px] font-bold font-display text-text-primary mb-1">
                        {title}
                    </h2>
                    <p className="text-[14px] text-text-secondary">{description}</p>
                </div>

                <div className="px-6 pb-6 flex items-center gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-[14px] font-medium bg-bg-surface-2 border border-border text-text-primary hover:bg-border-light transition-colors disabled:opacity-50"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-[14px] font-medium bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Usuwanie…" : "Usuń"}
                    </button>
                </div>
            </div>
        </div>
    );
}
