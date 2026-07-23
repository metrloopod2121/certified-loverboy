export {};

type ThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type SafeAreaInset = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type WebAppEvent = "themeChanged" | "safeAreaChanged" | "contentSafeAreaChanged" | "fullscreenChanged" | "viewportChanged";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        colorScheme: "light" | "dark";
        themeParams: ThemeParams;
        safeAreaInset: SafeAreaInset;
        contentSafeAreaInset: SafeAreaInset;
        isExpanded: boolean;
        ready: () => void;
        expand: () => void;
        requestFullscreen?: () => void;
        downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        onEvent: (event: WebAppEvent, callback: () => void) => void;
        offEvent: (event: WebAppEvent, callback: () => void) => void;
      };
    };
  }
}
