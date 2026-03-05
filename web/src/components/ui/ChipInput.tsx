"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ChipInputProps {
    label: string;
    placeholder?: string;
    value: string[];
    onChange: (items: string[]) => void;
    disabled?: boolean;
}

export default function ChipInput({ label, placeholder, value, onChange, disabled }: ChipInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newItem = inputValue.trim();
            if (newItem && !value.includes(newItem)) {
                onChange([...value, newItem]);
                setInputValue("");
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const removeChip = (indexToRemove: number) => {
        if (disabled) return;
        onChange(value.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[13px] font-medium text-text-primary">
                {label}
            </label>
            <div
                className={`
          flex flex-wrap items-center gap-2 p-2 min-h-[42px] bg-bg-surface border rounded-md transition-colors
          ${disabled ? 'bg-bg-surface-2 border-border-light cursor-not-allowed opacity-70' : 'border-border focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'}
        `}
            >
                {value.map((item, index) => (
                    <div
                        key={index}
                        className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[13px] font-medium 
              ${disabled ? 'bg-border-light text-text-secondary' : 'bg-accent-light text-accent'}
            `}
                    >
                        <span>{item}</span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeChip(index)}
                                className="hover:text-accent-hover focus:outline-none"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ""}
                    disabled={disabled}
                    className="flex-1 min-w-[120px] bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed"
                />
            </div>
            <p className="text-[12px] text-text-tertiary mt-0.5">Wciśnij Enter lub Przecinek by dodać.</p>
        </div>
    );
}
