import AuthGate from "@/components/AuthGate";
import MapScreen from "@/components/MapScreen";

export default function MapPage() {
  return (
    <AuthGate allow={["OWNER", "PARTNER"]}>
      <MapScreen />
    </AuthGate>
  );
}
