import AuthGate from "@/components/AuthGate";
import StorageScreen from "@/components/StorageScreen";

export default function Home() {
  return (
    <AuthGate>
      <StorageScreen />
    </AuthGate>
  );
}
