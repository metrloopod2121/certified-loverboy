import AuthGate from "@/components/AuthGate";
import MapScreen from "@/components/MapScreen";

export default function MapPage() {
  return (
    <AuthGate>
      <MapScreen />
    </AuthGate>
  );
}
