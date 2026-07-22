export type Location = {
  id: string;
  address: string | null;
  metro: string | null;
  lat: number | null;
  lng: number | null;
  url: string | null;
};

export type LocationInput = {
  address: string;
  metro: string;
  lat: number | null;
  lng: number | null;
  url: string;
};

export type DateIdea = {
  id: string;
  title: string;
  description: string | null;
  swipeDescription: string | null;
  priceNote: string | null;
  tags: { tag: { id: string; name: string } }[];
  locations: Location[];
  createdAt: string;
  updatedAt: string;
};

export type DateIdeaInput = {
  title: string;
  description: string;
  swipeDescription: string;
  priceNote: string;
  tags: string[];
  locations: LocationInput[];
};

export type MatchWithIdea = {
  id: string;
  dateIdeaId: string;
  matchedAt: string;
  isFavorite: boolean;
  dateIdea: DateIdea;
};

export function locationToInput(location: Location): LocationInput {
  return {
    address: location.address ?? "",
    metro: location.metro ?? "",
    lat: location.lat,
    lng: location.lng,
    url: location.url ?? "",
  };
}

export function dateIdeaToInput(idea: DateIdea): DateIdeaInput {
  return {
    title: idea.title,
    description: idea.description ?? "",
    swipeDescription: idea.swipeDescription ?? "",
    priceNote: idea.priceNote ?? "",
    tags: idea.tags.map((t) => t.tag.name),
    locations: idea.locations.map(locationToInput),
  };
}
