'use client';

import React from 'react';

interface PaywallBannerProps {
    messagesUsed: number;
    messagesLimit: number;
    messageLimitReached: string;
    upgradeToPro: string;
}

export default function PaywallBanner({
    messagesUsed,
    messagesLimit,
    messageLimitReached,
    upgradeToPro,
}: PaywallBannerProps) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-2xl">
                {/* Background decoration */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <div className="relative z-10 text-center">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="text-2xl font-bold mb-2">{messageLimitReached}</h3>
                    <p className="text-white/80 mb-6">
                        {messagesUsed}/{messagesLimit} ✉️
                    </p>

                    {/* Progress bar */}
                    <div className="w-full bg-white/20 rounded-full h-2 mb-6 max-w-xs mx-auto">
                        <div
                            className="bg-white rounded-full h-2 transition-all"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        className="px-8 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
                        onClick={() => {
                            // TODO: Stripe checkout
                            alert('Coming soon! Contact admin for PRO access.');
                        }}
                    >
                        ✨ {upgradeToPro}
                    </button>
                </div>
            </div>
        </div>
    );
}
