export type DateIdea = {
  id: string;
  title: string;
  address: string | null;
  metro: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  swipeDescription: string | null;
  priceNote: string | null;
  tags: { tag: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
};

export type DateIdeaInput = {
  title: string;
  address: string;
  metro: string;
  lat: number | null;
  lng: number | null;
  description: string;
  swipeDescription: string;
  priceNote: string;
  tags: string[];
};

export type MatchWithIdea = {
  id: string;
  dateIdeaId: string;
  matchedAt: string;
  dateIdea: DateIdea;
};

export function dateIdeaToInput(idea: DateIdea): DateIdeaInput {
  return {
    title: idea.title,
    address: idea.address ?? "",
    metro: idea.metro ?? "",
    lat: idea.lat,
    lng: idea.lng,
    description: idea.description ?? "",
    swipeDescription: idea.swipeDescription ?? "",
    priceNote: idea.priceNote ?? "",
    tags: idea.tags.map((t) => t.tag.name),
  };
}
