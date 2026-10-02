import { db } from "@/lib/db";
import { postScopeFilter, type AccessUser } from "@/lib/access";
import { acceptedFollow } from "@/lib/follow";
import { isModerator } from "@/lib/permissions";

/**
 * Kush mund ta marrë një skedar të ngarkuar.
 *
 * Deri tani `/api/media/[id]` kërkonte vetëm sesion, prandaj një link i kopjuar
 * hapej nga cilido student i kyçur. Këtu lidhja bëhet me përmbajtjen: një foto
 * e një storje ndjek rregullat e storjes, një foto e një postimi ndjek shtrirjen
 * e postimit. Avatarët dhe kopertinat mbeten të hapura brenda platformës, sepse
 * ato janë pjesë e identitetit publik.
 */
export async function canViewMediaAsset(viewer: AccessUser, assetId: string, ownerId: string) {
  if (viewer.id === ownerId) return true;

  // I njëjti skedar mund të jetë ngarkuar nga disa veta, sepse ruajtja bëhet
  // sipas përmbajtjes. Kush e ngarkoi vetë e sheh gjithmonë.
  const claim = await db.mediaUpload.findUnique({
    where: { assetId_userId: { assetId, userId: viewer.id } },
    select: { assetId: true },
  });
  if (claim) return true;

  // Fotoja e ID-së studentore: përveç pronarit, e hap vetëm moderimi, dhe
  // vetëm derisa të merret vendimi (pastaj referenca fshihet).
  const reference = `/api/media/${assetId}`;
  const idDocument = await db.verification.findFirst({
    where: { idDocumentRef: reference },
    select: { id: true },
  });
  if (idDocument) return isModerator(viewer);

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: ownerId, blockedId: viewer.id },
        { blockerId: viewer.id, blockedId: ownerId },
      ],
    },
    select: { id: true },
  });
  if (blocked) return false;

  const story = await db.story.findFirst({
    where: { mediaUrl: { contains: reference } },
    select: { authorId: true, author: { select: { isPrivate: true } } },
  });
  if (story) {
    const follows = await db.follow.findFirst({
      where: { followerId: viewer.id, followingId: story.authorId, ...acceptedFollow },
      select: { id: true },
    });
    // Ndjekësi e sheh gjithmonë. Një profil publik e hap edhe për vizitorin e profilit.
    return Boolean(follows) || !story.author.isPrivate;
  }

  // Fotoja e një dosjeje storjesh ndjek rregullin e storjes: ndjekësi, ose kushdo kur profili është publik.
  const highlight = await db.storyHighlight.findFirst({
    where: { coverUrl: reference },
    select: { userId: true, user: { select: { isPrivate: true } } },
  });
  if (highlight) {
    if (!highlight.user.isPrivate) return true;
    const follows = await db.follow.findFirst({
      where: { followerId: viewer.id, followingId: highlight.userId, ...acceptedFollow },
      select: { id: true },
    });
    return Boolean(follows);
  }

  const post = await db.post.findFirst({
    where: { media: { contains: assetId }, ...postScopeFilter(viewer) },
    select: { id: true, authorId: true, author: { select: { isPrivate: true } } },
  });
  if (post) {
    if (post.authorId === viewer.id || !post.author.isPrivate) return true;
    const follows = await db.follow.findFirst({
      where: { followerId: viewer.id, followingId: post.authorId, ...acceptedFollow },
      select: { id: true },
    });
    return Boolean(follows);
  }

  // Imazhi i dërguar asistentit është i studentit: askush tjetër nuk e hap.
  const aiImage = await db.aiMessage.findFirst({
    where: { attachments: { contains: assetId } },
    select: { conversation: { select: { userId: true } } },
  });
  if (aiImage) return aiImage.conversation.userId === viewer.id;

  // Një skedar i dërguar në bisedë, zë ose foto, e sheh vetëm kush është brenda saj.
  const message = await db.message.findFirst({
    where: { media: { contains: assetId } },
    select: { conversationId: true },
  });
  if (message) {
    const member = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: viewer.id } },
      select: { id: true },
    });
    return Boolean(member);
  }

  // Bashkëngjitja në bisedën e një dhome zëri: e sheh kush ka pasur vend në atë dhomë.
  const roomMessage = await db.voiceMessage.findFirst({
    where: { media: { contains: assetId } },
    select: { roomId: true },
  });
  if (roomMessage) {
    const seat = await db.voiceParticipant.findUnique({
      where: { roomId_userId: { roomId: roomMessage.roomId, userId: viewer.id } },
      select: { removedAt: true },
    });
    return Boolean(seat && !seat.removedAt);
  }

  // Postimi ekziston, por jashtë rrethit të shikuesit: skedari nuk hapet.
  const hiddenPost = await db.post.findFirst({
    where: { media: { contains: assetId } },
    select: { id: true },
  });
  if (hiddenPost) return false;

  return true;
}
