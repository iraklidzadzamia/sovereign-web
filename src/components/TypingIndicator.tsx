'use client';

import React from 'react';

interface TypingIndicatorProps {
    character: string;
    emoji: string;
}

export default function TypingIndicator({ character, emoji }: TypingIndicatorProps) {
    return (
        <div className="flex gap-3 mb-4 animate-fade-in">
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xl shadow-sm">
                {emoji}
            </div>

            {/* Bubble with typing dots */}
            <div className="max-w-[80%]">
                {/* Character name */}
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    {character}
                </div>

                {/* Typing indicator bubble */}
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100 dark:bg-gray-800">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
