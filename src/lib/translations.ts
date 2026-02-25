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
        placeholders: [
            "Ask your board for advice...",
            "Analyze my idea...",
            "Help me decide...",
            "Critique my plan...",
            "Brainstorm solutions..."
        ],
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
        system: "System",

        // Judge
        chatWithJudge: "Chat with Judge",
        moderator: "Moderator",

        // Agents page
        agentEditor: "Agent Editor",
        agentEditorSubtitle: "Customize your round table",
        addAgent: "Add",
        agentNamePlaceholder: "Agent name",
        agentDescPlaceholder: "Brief role description...",
        agentPromptPlaceholder: "System prompt for this agent...",
        agentImagePlaceholder: "Avatar URL (optional)",
        deleteAgentConfirm: "Delete this advisor?",
        noAgents: "No advisors. Click \"Add\" to create your first!",
        characters: "characters",

        // Auth
        login: "Sign In",
        signup: "Sign Up",
        logout: "Log Out",
        emailLabel: "Email",
        passwordLabel: "Password",
        googleLogin: "Continue with Google",
        orContinueWith: "or",
        loginError: "Login failed. Please try again.",
        signupSuccess: "Check your email to confirm your account!",
        alreadyHaveAccount: "Already have an account? Sign in",
        dontHaveAccount: "Don't have an account? Sign up",
        appSubtitle: "Your AI Board of Advisors",

        // Paywall
        messageLimitReached: "You've used all your free messages",
        upgradeToPro: "Upgrade to PRO",
        messagesRemaining: "messages remaining",
        unlimitedMessages: "Unlimited messages",
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
        placeholders: [
            "Посоветуйтесь с бордом...",
            "Проанализируй мою идею...",
            "Помоги принять решение...",
            "Критически оцени мой план...",
            "Давайте найдем решение..."
        ],
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
        system: "Системная",

        // Judge
        chatWithJudge: "Чат с Судьёй",
        moderator: "Модератор",

        // Agents page
        agentEditor: "Редактор советников",
        agentEditorSubtitle: "Настрой свой круглый стол",
        addAgent: "Добавить",
        agentNamePlaceholder: "Имя советника",
        agentDescPlaceholder: "Краткое описание роли...",
        agentPromptPlaceholder: "System prompt для этого советника...",
        agentImagePlaceholder: "URL аватара (опционально)",
        deleteAgentConfirm: "Удалить этого советника?",
        noAgents: "Нет советников. Нажми \"Добавить\" чтобы создать первого!",
        characters: "персонажей",

        // Auth
        login: "Войти",
        signup: "Регистрация",
        logout: "Выйти",
        emailLabel: "Email",
        passwordLabel: "Пароль",
        googleLogin: "Войти через Google",
        orContinueWith: "или",
        loginError: "Ошибка входа. Попробуйте ещё раз.",
        signupSuccess: "Проверьте email для подтверждения аккаунта!",
        alreadyHaveAccount: "Уже есть аккаунт? Войти",
        dontHaveAccount: "Нет аккаунта? Зарегистрироваться",
        appSubtitle: "Ваш ИИ-совет директоров",

        // Paywall
        messageLimitReached: "Вы использовали все бесплатные сообщения",
        upgradeToPro: "Перейти на PRO",
        messagesRemaining: "сообщений осталось",
        unlimitedMessages: "Безлимитные сообщения",
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
        placeholders: [
            "სთხოვეთ რჩევა საბჭოს...",
            "გააანალიზეთ ჩემი იდეა...",
            "დამეხმარეთ გადაწყვეტილებაში...",
            "შეაფასეთ ჩემი გეგმა...",
            "ვიპოვოთ გამოსავალი..."
        ],
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
        system: "სისტემური",

        // Judge
        chatWithJudge: "მოსამართლესთან ჩატი",
        moderator: "მოდერატორი",

        // Agents page
        agentEditor: "მრჩეველთა რედაქტორი",
        agentEditorSubtitle: "მოარგეთ თქვენი მრგვალი მაგიდა",
        addAgent: "დამატება",
        agentNamePlaceholder: "მრჩეველის სახელი",
        agentDescPlaceholder: "როლის მოკლე აღწერა...",
        agentPromptPlaceholder: "ამ მრჩეველის სისტემური მითითება...",
        agentImagePlaceholder: "ავატარის URL (არასავალდებულო)",
        deleteAgentConfirm: "წავშალოთ ეს მრჩეველი?",
        noAgents: "მრჩეველები არ არის. დააჭირეთ \"დამატებას\" პირველის შესაქმნელად!",
        characters: "პერსონაჟი",

        // Auth
        login: "შესვლა",
        signup: "რეგისტრაცია",
        logout: "გასვლა",
        emailLabel: "ელფოსტა",
        passwordLabel: "პაროლი",
        googleLogin: "Google-ით შესვლა",
        orContinueWith: "ან",
        loginError: "შესვლის შეცდომა. სცადეთ ხელახლა.",
        signupSuccess: "შეამოწმეთ ელფოსტა ანგარიშის დასადასტურებლად!",
        alreadyHaveAccount: "უკვე გაქვთ ანგარიში? შესვლა",
        dontHaveAccount: "არ გაქვთ ანგარიში? რეგისტრაცია",
        appSubtitle: "თქვენი AI მრჩეველთა საბჭო",

        // Paywall
        messageLimitReached: "თქვენ გამოიყენეთ ყველა უფასო შეტყობინება",
        upgradeToPro: "PRO-ზე გადასვლა",
        messagesRemaining: "შეტყობინება დარჩა",
        unlimitedMessages: "ულიმიტო შეტყობინებები",
    }
};
