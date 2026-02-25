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
                    className={`flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 flex items-center justify-center text-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] transition-all ${onCharacterClick ? 'cursor-pointer hover:scale-110 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50' : ''
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

                {/* Message bubble - neumorphic / clean styles */}
                <div
                    className={`rounded-[1.25rem] px-5 py-3.5 mb-1 ${isUser
                        ? 'bg-indigo-600 text-white rounded-br-md shadow-[0_4px_14px_-4px_rgba(79,70,229,0.3)]'
                        : 'bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 rounded-bl-md shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100/50 dark:border-gray-800 dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)]'
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
