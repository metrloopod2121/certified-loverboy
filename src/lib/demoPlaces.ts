import { prisma } from "@/lib/db";
import { parseDateMarkdown } from "@/lib/parseDateMarkdown";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";

/** Demo places shown to a brand-new account so it isn't empty on first open. Each entry is
 *  raw markdown in the same format as docs/import-prompt.md / the "Import file" screen —
 *  paste in real curated content here (kept empty until that's provided; seeding is a no-op
 *  while this list is empty). */
const DEMO_PLACES_MARKDOWN: string[] = [];

/** Seeds a brand-new user's base with demo places, exactly once — a no-op once they have any
 *  place of their own (including having deleted every seeded one), so it never re-seeds
 *  someone who intentionally emptied their base. */
export async function seedDemoPlacesIfEmpty(telegramUserId: string): Promise<void> {
  if (DEMO_PLACES_MARKDOWN.length === 0) return;

  const existingCount = await prisma.dateIdea.count({ where: { telegramUserId } });
  if (existingCount > 0) return;

  for (const raw of DEMO_PLACES_MARKDOWN) {
    const parsed = parseDateMarkdown(raw);
    const tagIds = await resolveTagIds(withoutMetroTags(parsed.tags, parsed.locations.map((loc) => loc.metro)));

    await prisma.dateIdea.create({
      data: {
        telegramUserId,
        title: parsed.title,
        description: parsed.description || null,
        priceNote: parsed.priceNote || null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        locations: {
          create: parsed.locations.map((loc) => ({
            address: loc.address || null,
            metro: loc.metro || null,
            lat: loc.lat,
            lng: loc.lng,
            url: loc.url || null,
          })),
        },
      },
    });
  }
}
