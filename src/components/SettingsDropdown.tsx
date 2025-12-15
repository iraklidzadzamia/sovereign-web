import { useState, useRef, useEffect } from 'react';
import { Settings, Check, ChevronDown, Flag, MessageSquare, Moon, Sun, Monitor, Globe, Cpu, Languages } from 'lucide-react';
import { translations, Language, UI_LANGUAGES } from '@/lib/translations';

// Existing output languages for AI
const OUTPUT_LANGUAGES = [
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

interface SettingsDropdownProps {
    uiLanguage: Language;
    language: string; // Output language
    model: string;
    theme: string;
    onUiLanguageChange: (lang: Language) => void;
    onLanguageChange: (lang: string) => void;
    onModelChange: (model: string) => void;
    onThemeChange: (theme: string) => void;
}

export default function SettingsDropdown({
    uiLanguage,
    language, // Output language
    model,
    theme,
    onUiLanguageChange,
    onLanguageChange,
    onModelChange,
    onThemeChange,
}: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const t = translations[uiLanguage] || translations['en'];

    const THEMES = [
        { id: 'light', name: t.light, icon: Sun },
        { id: 'dark', name: t.dark, icon: Moon },
        { id: 'system', name: t.system, icon: Monitor },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeUiFlag = UI_LANGUAGES?.find(l => l.code === uiLanguage)?.flag || '🌐';
    const activeOutputFlag = OUTPUT_LANGUAGES.find(l => l.code === language)?.flag || '🤖';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <Settings className="w-4 h-4" />
                    <span className="flex items-center gap-1">
                        <span>{activeUiFlag}</span>
                        <span className="text-gray-300">|</span>
                        <span>{activeOutputFlag}</span>
                    </span>
                    <span className="hidden sm:inline-block max-w-[80px] truncate">
                        {model}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* UI Language Section */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Languages className="w-3.5 h-3.5" /> {t.interfaceLanguage}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {(UI_LANGUAGES || []).map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        onUiLanguageChange(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium transition-all ${uiLanguage === lang.code
                                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transform'
                                        }`}
                                >
                                    <span className="text-xl">{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Output Language Section */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {t.outputLanguage}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {OUTPUT_LANGUAGES.map((lang) => (
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
                                {theme === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />} {t.theme}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {THEMES.map((th) => {
                                const Icon = th.icon;
                                return (
                                    <button
                                        key={th.id}
                                        onClick={() => {
                                            onThemeChange(th.id);
                                            setIsOpen(false);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors ${theme === th.id
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{th.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Model */}
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> {t.model}
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
