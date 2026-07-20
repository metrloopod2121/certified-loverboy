import AuthGate from "@/components/AuthGate";
import MatchesScreen from "@/components/MatchesScreen";

export default function MatchesPage() {
  return (
    <AuthGate allow={["OWNER", "PARTNER"]}>
      <MatchesScreen />
    </AuthGate>
  );
}
