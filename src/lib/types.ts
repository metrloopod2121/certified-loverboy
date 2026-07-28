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

export type PlaceLink = {
  id: string;
  label: string | null;
  url: string;
};

export type PlaceLinkInput = {
  label: string;
  url: string;
};

export type DateIdea = {
  id: string;
  title: string;
  description: string | null;
  priceNote: string | null;
  /// One-time dated event window (concert, show, tournament...) -- both null for an ordinary
  /// evergreen place. ISO strings, like createdAt/updatedAt.
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  tags: { tag: { id: string; name: string } }[];
  locations: Location[];
  links: PlaceLink[];
  createdAt: string;
  updatedAt: string;
};

export type DateIdeaInput = {
  title: string;
  description: string;
  priceNote: string;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  tags: string[];
  locations: LocationInput[];
  links: PlaceLinkInput[];
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

export function linkToInput(link: PlaceLink): PlaceLinkInput {
  return { label: link.label ?? "", url: link.url };
}

export function dateIdeaToInput(idea: DateIdea): DateIdeaInput {
  return {
    title: idea.title,
    description: idea.description ?? "",
    priceNote: idea.priceNote ?? "",
    eventStartsAt: idea.eventStartsAt,
    eventEndsAt: idea.eventEndsAt,
    tags: idea.tags.map((t) => t.tag.name),
    locations: idea.locations.map(locationToInput),
    links: idea.links.map(linkToInput),
  };
}
