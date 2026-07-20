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

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        themeParams: ThemeParams;
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        onEvent: (event: "themeChanged", callback: () => void) => void;
        offEvent: (event: "themeChanged", callback: () => void) => void;
      };
    };
  }
}
