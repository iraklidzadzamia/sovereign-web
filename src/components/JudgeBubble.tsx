'use client';

import React from 'react';

interface JudgeBubbleProps {
    question: string;
    onOptionClick?: (option: string) => void;
}

export default function JudgeBubble({ question, onOptionClick }: JudgeBubbleProps) {
    return (
        <div className="flex gap-3 mb-4 animate-fade-in">
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900 flex items-center justify-center text-xl shadow-sm">
                ⚖️
            </div>

            {/* Bubble */}
            <div className="max-w-[80%]">
                {/* Character name */}
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 ml-1">
                    Модератор
                </div>

                {/* Message bubble with yellow/amber background */}
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                    <p className="text-gray-800 dark:text-gray-200 text-sm">
                        {question}
                    </p>
                </div>
            </div>
        </div>
    );
}
