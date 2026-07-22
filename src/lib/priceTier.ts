const PRICE_TIERS = [
  { limit: 1_000, label: "₽" },
  { limit: 3_000, label: "₽₽" },
  { limit: 5_000, label: "₽₽₽" },
] as const;

export function priceTier(priceNote: string | null): string | null {
  if (!priceNote) return null;

  const amounts = [...priceNote.matchAll(/\d[\d\s.,]*/g)]
    .map(([amount]) => Number(amount.replace(/\D/g, "")))
    .filter(Number.isFinite);

  if (amounts.length === 0) return null;

  const upperPrice = Math.max(...amounts);
  return PRICE_TIERS.find((tier) => upperPrice <= tier.limit)?.label ?? "₽₽₽₽";
}
