import AuthGate from "@/components/AuthGate";
import PlaceDetailScreen from "@/components/PlaceDetailScreen";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AuthGate>
      <PlaceDetailScreen key={id} id={id} />
    </AuthGate>
  );
}
