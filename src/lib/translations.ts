export type Language = 'en' | 'ru' | 'ka';

export const UI_LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
];

export const translations = {
    en: {
        // Sidebar & Header
        history: "History",
        newAnalysis: "New Analysis",
        noConversations: "No saved conversations",
        edit: "Edit",
        subtitle: "Your Virtual Board of Advisors",

        // Input Area
        describeIdea: "Describe your idea",
        placeholder: "Example: I want to open a Georgian bakery in Germany...",
        startAnalysis: "Start Analysis",
        analyzing: "Analyzing...",

        // Main Content
        roundTableTitle: "Round Table (10 advisors)",

        // Settings
        interfaceLanguage: "Interface Language",
        outputLanguage: "Output Language",
        theme: "Theme",
        model: "Model",

        // Analysis View
        confidence: "confidence",
        actionPlan: "Action Plan:",
        advisorsOpinions: "Advisors' Opinions",
        clickToChat: "(click to chat)",
        risk: "Risk",

        // Chat
        askQuestion: "Ask a question...",

        // Edit Modal
        editing: "Editing",
        name: "Name",
        descriptionLabel: "Description (visible to user)",
        promptLabel: "System Prompt (instruction for AI)",
        cancel: "Cancel",
        save: "Save",
        saveError: "Error saving",

        // Theme
        light: "Light",
        dark: "Dark",
        system: "System"
    },
    ru: {
        // Sidebar & Header
        history: "История",
        newAnalysis: "Новый анализ",
        noConversations: "Нет сохранённых разговоров",
        edit: "Редактировать",
        subtitle: "Your Virtual Board of Advisors", // Brand tagline often kept in English, but can translate if preferred

        // Input Area
        describeIdea: "Опиши свою идею",
        placeholder: "Например: Хочу открыть грузинскую пекарню в Германии...",
        startAnalysis: "Запустить анализ",
        analyzing: "Анализируем...",

        // Main Content
        roundTableTitle: "Круглый стол (10 советников)",

        // Settings
        interfaceLanguage: "Язык интерфейса",
        outputLanguage: "Язык ответа AI",
        theme: "Тема",
        model: "Модель",

        // Analysis View
        confidence: "уверенность",
        actionPlan: "План действий:",
        advisorsOpinions: "Мнения советников",
        clickToChat: "(нажми для чата)",
        risk: "Риск",

        // Chat
        askQuestion: "Задай вопрос...",

        // Edit Modal
        editing: "Редактирование",
        name: "Имя",
        descriptionLabel: "Описание (видит пользователь)",
        promptLabel: "Системный Промпт (инструкция для AI)",
        cancel: "Отмена",
        save: "Сохранить",
        saveError: "Ошибка при сохранении",

        // Theme
        light: "Светлая",
        dark: "Темная",
        system: "Системная"
    },
    ka: {
        // Sidebar & Header
        history: "ისტორია",
        newAnalysis: "ახალი ანალიზი",
        noConversations: "შენახული საუბრები არ არის",
        edit: "რედაქტირება",
        subtitle: "თქვენი ვირტუალური მრჩეველთა საბჭო",

        // Input Area
        describeIdea: "აღწერეთ თქვენი იდეა",
        placeholder: "მაგალითად: მინდა გავხსნა ქართული საცხობი გერმანიაში...",
        startAnalysis: "ანალიზის დაწყება",
        analyzing: "მუშავდება...",

        // Main Content
        roundTableTitle: "მრგვალი მაგიდა (10 მრჩეველი)",

        // Settings
        interfaceLanguage: "ინტერფეისის ენა",
        outputLanguage: "AI პასუხის ენა",
        theme: "თემა",
        model: "მოდელი",

        // Analysis View
        confidence: "სანდოობა",
        actionPlan: "სამოქმედო გეგმა:",
        advisorsOpinions: "მრჩეველთა მოსაზრებები",
        clickToChat: "(დააჭირეთ სასაუბროდ)",
        risk: "რისკი",

        // Chat
        askQuestion: "დასვით შეკითხვა...",

        // Edit Modal
        editing: "რედაქტირება",
        name: "სახელი",
        descriptionLabel: "აღწერა (ჩანს მომხმარებლისთვის)",
        promptLabel: "სისტემური მითითება (AI ინსტრუქცია)",
        cancel: "გაუქმება",
        save: "შენახვა",
        saveError: "შენახვის შეცდომა",

        // Theme
        light: "ნათელი",
        dark: "მუქი",
        system: "სისტემური"
    }
};
