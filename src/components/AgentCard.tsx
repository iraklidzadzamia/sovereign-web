'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AgentCardProps {
    id: string;
    name: string;
    description: string;
    emoji: string;
    imageUrl?: string;
    onClick?: () => void;
}

// Map of agent IDs to their avatar images
const AVATAR_IMAGES: Record<string, string> = {
    socrates: '/avatars/socrates.png',
    skeptical_buyer: '/avatars/skeptical_buyer.png',
    shark: '/avatars/shark.png',
    brutal_operator: '/avatars/brutal_operator.png',
    black_swan: '/avatars/black_swan.png',
    futurist: '/avatars/futurist.png',
    esoteric: '/avatars/esoteric.png',
    archaeologist: '/avatars/archaeologist.png',
};

export default function AgentCard({
    id,
    name,
    description,
    emoji,
    imageUrl,
    onClick,
}: AgentCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Use custom image, or our generated avatar, or fallback to emoji
    const avatarSrc = imageUrl || AVATAR_IMAGES[id];
    const hasImage = !!avatarSrc;

    return (
        <div
            className="relative group"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div
                onClick={onClick}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 text-center 
                   hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:shadow-lg 
                   transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700
                   hover:border-indigo-300 dark:hover:border-indigo-700 hover:scale-105"
            >
                {/* Avatar */}
                <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {hasImage ? (
                        <Image
                            src={avatarSrc}
                            alt={name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-3xl">{emoji}</span>
                    )}
                </div>

                {/* Name */}
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{name}</div>

                {/* Short description (truncated) */}
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {description}
                </div>
            </div>

            {/* Tooltip with full description */}
            {showTooltip && description.length > 50 && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 
                        w-64 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl
                        animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="font-semibold mb-1">{name}</div>
                    <div className="text-gray-300 leading-relaxed">{description}</div>
                    {/* Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full 
                          border-8 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}
