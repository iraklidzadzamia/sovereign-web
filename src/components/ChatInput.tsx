'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
}

export interface ChatInputRef {
    insertText: (text: string) => void;
    focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
    ({ onSend, disabled, loading, placeholder }, ref) => {
        const [message, setMessage] = useState('');
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        // Expose methods to parent
        useImperativeHandle(ref, () => ({
            insertText: (text: string) => {
                setMessage(prev => {
                    // Add space if needed
                    const needsSpace = prev.length > 0 && !prev.endsWith(' ');
                    return prev + (needsSpace ? ' ' : '') + text + ' ';
                });
                textareaRef.current?.focus();
            },
            focus: () => {
                textareaRef.current?.focus();
            }
        }));

        // Auto-resize textarea
        useEffect(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
            }
        }, [message]);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (message.trim() && !disabled && !loading) {
                onSend(message.trim());
                setMessage('');
                // Reset height
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        };

        return (
            <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder || 'Type a message...'}
                            disabled={disabled || loading}
                            rows={1}
                            className="w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 pr-12 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: '48px', maxHeight: '150px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!message.trim() || disabled || loading}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {loading && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Characters are typing...
                    </div>
                )}
            </form>
        );
    }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
