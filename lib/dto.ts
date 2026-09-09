/**
 * DTO-të e ekspozuara. Asnjë endpoint dhe asnjë komponent nuk merr rreshtin e
 * papërpunuar të bazës: email-i, hash-i i fjalëkalimit dhe identiteti prapa
 * postimeve anonime nuk dalin kurrë jashtë serverit.
 */

export type PublicAuthor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  facultyName: string | null;
  facultyColor: string | null;
  year: number | null;
};

export type AnonymousAuthor = {
  pseudonym: string;
};

export type PostAuthor =
  | { anonymous: false; profile: PublicAuthor }
  | { anonymous: true; profile: AnonymousAuthor };

export type PostDto = {
  id: string;
  type: string;
  text: string;
  media: string[];
  createdAt: string;
  courseId: string | null;
  course: { id: string; name: string; code: string; facultyColor: string | null } | null;
  material: {
    id: string;
    title: string;
    type: string;
    pages: number | null;
    size: number;
    rating: number;
    downloads: number;
    verificationStatus: string;
  } | null;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    kind: string;
    goingCount: number;
  } | null;
  poll: {
    totalVotes: number;
    myOptionId: string | null;
    options: { id: string; text: string; votes: number }[];
  } | null;
  author: PostAuthor;
  counts: { likes: number; comments: number; saves: number };
  viewer: { liked: boolean; saved: boolean; isAuthor: boolean };
  isHidden: boolean;
};

type RawUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  year: number | null;
  faculty?: { name: string; color: string } | null;
};

export function toPublicAuthor(user: RawUser): PublicAuthor {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    isVerified: user.isVerified,
    facultyName: user.faculty?.name ?? null,
    facultyColor: user.faculty?.color ?? null,
    year: user.year,
  };
}
