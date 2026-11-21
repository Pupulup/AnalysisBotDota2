export function initTelegram() {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
        console.log("Telegram WebApp SDK не обнаружен.");
        return;
    }

    try {
        // Сообщаем Telegram, что приложение готово
        webApp.ready();

        // Просим Telegram развернуть приложение
        webApp.expand();

        // Определяем, где запущено приложение
        const isTelegram = Boolean(webApp.initData);

        document.documentElement.dataset.telegram = String(isTelegram);

        // Передаём параметры темы в CSS
        const root = document.documentElement;

        root.style.setProperty(
            "--tg-theme-bg-color",
            webApp.themeParams.bg_color || "#0b0e14"
        );

        root.style.setProperty(
            "--tg-theme-text-color",
            webApp.themeParams.text_color || "#edf1fa"
        );

        // Передаём высоту окна Telegram
        root.style.setProperty(
            "--tg-viewport-height",
            `${webApp.viewportHeight}px`
        );

        root.style.setProperty(
            "--tg-viewport-stable-height",
            `${webApp.viewportStableHeight}px`
        );

        // Передаём безопасные отступы
        root.style.setProperty(
            "--tg-safe-area-top",
            `${webApp.safeAreaInset.top}px`
        );

        root.style.setProperty(
            "--tg-safe-area-bottom",
            `${webApp.safeAreaInset.bottom}px`
        );

        console.log("Telegram WebApp initialized:", {
            platform: webApp.platform,
            version: webApp.version,
            colorScheme: webApp.colorScheme,
            isTelegram
        });

    } catch (error) {
        console.error("Telegram initialization error:", error);
    }
}