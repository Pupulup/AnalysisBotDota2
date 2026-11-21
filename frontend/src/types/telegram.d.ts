interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name?: string;
            username?: string;
        };
    };

    version: string;
    platform: string;
    colorScheme: "light" | "dark";
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
        secondary_bg_color?: string;
    };

    viewportHeight: number;
    viewportStableHeight: number;
    isExpanded: boolean;

    safeAreaInset: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };

    ready(): void;
    expand(): void;
}

interface Window {
    Telegram?: {
        WebApp: TelegramWebApp;
    };
}