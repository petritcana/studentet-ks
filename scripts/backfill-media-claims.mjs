/**
 * Mbush `MediaUpload` për skedarët e ngarkuar para se ai regjistër të ekzistonte.
 *
 * Deri tani pronësia e një skedari matej nga `MediaAsset.ownerId`. Meqë skedarët
 * ruhen sipas përmbajtjes, dy studentë me të njëjtën foto ndanin një rresht të
 * vetëm dhe i dyti nuk e vendoste dot atë as si avatar. Tani pronësia matet nga
 * kërkesat e ngarkimit, prandaj pronarët e vjetër duhet të marrin të vetat.
 *
 * I sigurt të lëshohet sa herë të duash.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const assets = await db.mediaAsset.findMany({ select: { id: true, ownerId: true } });

let written = 0;
for (const asset of assets) {
  const result = await db.mediaUpload.upsert({
    where: { assetId_userId: { assetId: asset.id, userId: asset.ownerId } },
    update: {},
    create: { assetId: asset.id, userId: asset.ownerId },
  });
  if (result) written += 1;
}

console.log(`backfill-media-claims: ${written} kërkesa pronësie nga ${assets.length} skedarë.`);
await db.$disconnect();
