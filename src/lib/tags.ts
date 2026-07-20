import { prisma } from "@/lib/db";

export async function resolveTagIds(names: string[]): Promise<string[]> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const tags = await Promise.all(
    cleaned.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  return tags.map((tag) => tag.id);
}
