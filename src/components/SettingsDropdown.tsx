import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, Globe, Cpu, Moon, Sun, Laptop } from 'lucide-react';

interface SettingsDropdownProps {
    language: string;
    model: string;
    theme: string;
    onLanguageChange: (lang: string) => void;
    onModelChange: (model: string) => void;
    onThemeChange: (theme: string) => void;
}

const LANGUAGES = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

const MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI' },
];

const THEMES = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'system', name: 'System', icon: Laptop },
];

export default function SettingsDropdown({
    language,
    model,
    theme = 'system',
    onLanguageChange,
    onModelChange,
    onThemeChange,
}: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
    const currentModel = MODELS.find(m => m.id === model) || MODELS[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent dark:border-gray-700"
            >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLang.flag} {currentModel.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Language */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Язык
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        onLanguageChange(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${language === lang.code
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                {theme === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />} Тема
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {THEMES.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            onThemeChange(t.id);
                                            setIsOpen(false);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors ${theme === t.id
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{t.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Model */}
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> Модель
                            </span>
                        </div>
                        <div className="space-y-1">
                            {MODELS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        onModelChange(m.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${model === m.id
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <span>{m.name}</span>
                                    <span className="text-xs text-gray-400">{m.provider}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
