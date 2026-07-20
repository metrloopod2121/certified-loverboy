import AuthGate from "@/components/AuthGate";
import SwipeScreen from "@/components/SwipeScreen";

export default function SwipePage() {
  return (
    <AuthGate allow={["OWNER", "PARTNER"]}>
      <SwipeScreen />
    </AuthGate>
  );
}
