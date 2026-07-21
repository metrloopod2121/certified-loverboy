import { Heart } from "lucide-react";

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-canvas)]"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      <Heart className="animate-pulse text-[var(--app-ink)]" size={56} fill="currentColor" />
    </div>
  );
}
