'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    character?: string;
    emoji?: string;
    timestamp?: string;
    onCharacterClick?: (characterName: string) => void;
}

export default function ChatBubble({
    role,
    content,
    character,
    emoji,
    timestamp,
    onCharacterClick
}: ChatBubbleProps) {
    const isUser = role === 'user';

    const handleAvatarClick = () => {
        if (!isUser && character && onCharacterClick) {
            onCharacterClick(character);
        }
    };

    return (
        <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar - clickable for assistant messages */}
            {!isUser && (
                <button
                    onClick={handleAvatarClick}
                    className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xl shadow-sm transition-all ${onCharacterClick ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-400' : ''
                        }`}
                    title={onCharacterClick ? `Click to mention @${character?.toLowerCase()}` : undefined}
                >
                    {emoji || '🤖'}
                </button>
            )}

            {/* Bubble */}
            <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Character name - also clickable */}
                {!isUser && character && (
                    <button
                        onClick={handleAvatarClick}
                        className={`text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1 ${onCharacterClick ? 'hover:text-indigo-500 cursor-pointer' : ''
                            }`}
                    >
                        {character}
                    </button>
                )}

                {/* Message bubble - iMessage style colors */}
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-[#007AFF] text-white rounded-br-md'
                        : 'bg-[#E9E9EB] dark:bg-[#3A3A3C] text-gray-900 dark:text-gray-100 rounded-bl-md'
                        }`}
                >
                    <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert !text-white' : 'dark:prose-invert'}`}>
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
                                a: ({ href, children }) => (
                                    <a href={href} className={`${isUser ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'} hover:underline`} target="_blank" rel="noopener noreferrer">
                                        {children}
                                    </a>
                                ),
                                code: ({ children }) => (
                                    <code className={`px-1 py-0.5 rounded text-sm ${isUser ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        {children}
                                    </code>
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Timestamp */}
                {timestamp && (
                    <div className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                        {timestamp}
                    </div>
                )}
            </div>

            {/* User avatar placeholder for alignment */}
            {isUser && <div className="w-10 flex-shrink-0" />}
        </div>
    );
}
