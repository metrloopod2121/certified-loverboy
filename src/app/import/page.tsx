import AuthGate from "@/components/AuthGate";
import ImportScreen from "@/components/ImportScreen";

export default function ImportPage() {
  return (
    <AuthGate allow={["OWNER"]}>
      <ImportScreen />
    </AuthGate>
  );
}
