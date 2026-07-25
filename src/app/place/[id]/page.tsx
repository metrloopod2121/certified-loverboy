import AuthGate from "@/components/AuthGate";
import PlaceDetailScreen from "@/components/PlaceDetailScreen";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AuthGate allow={["OWNER", "PARTNER"]}>
      <PlaceDetailScreen id={id} />
    </AuthGate>
  );
}
