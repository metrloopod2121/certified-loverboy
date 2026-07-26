import AuthGate from "@/components/AuthGate";
import ProfileScreen from "@/components/ProfileScreen";

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileScreen />
    </AuthGate>
  );
}
