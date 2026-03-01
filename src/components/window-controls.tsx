"use client";

import { cn } from "@/lib/utils";
import { Minus, Square, X } from "lucide-react";

type WindowControlsProps = {
    onClose: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
    bgColor?: string;
    className?: string | null;
};

export function WindowControls({
    onClose,
    onMinimize,
    onMaximize,
    bgColor = "bg-neutral-50 dark:bg-neutral-900",
    className = "px-3 py-3"
}: WindowControlsProps) {
    return (
        <div className={cn("flex items-center gap-3", bgColor, className ? className : "")}>
            <button
                onClick={onClose}
                className="group relative h-3.5 w-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
            >
                <X className="size-2.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {
                onMinimize && (
                    <button onClick={onMinimize} className="group relative h-3.5 w-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors flex items-center justify-center focus:outline-none">
                        <Minus className="size-2.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                )
            }

            {
                onMaximize && (
                    <button onClick={onMaximize} className="group relative h-3.5 w-3.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center focus:outline-none">
                        <Square className="size-2.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-colors" />
                    </button>
                )
            }
        </div>
    );
}
