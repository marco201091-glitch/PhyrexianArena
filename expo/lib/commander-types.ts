export interface CommanderSearchResult {
  id: string;
  name: string;
  imageUrl: string | null;
  typeLine: string;
  colorIdentity: string[];
  oracleText: string;
  keywords: string[];
}

export interface CommanderArtOption {
  id: string;
  name: string;
  imageUrl: string;
  setName: string;
  collectorNumber: string;
  releasedAt: string | null;
}

export type CommanderPartnerMode =
  | 'partner'
  | 'background'
  | 'background-owner'
  | 'friends'
  | 'doctor'
  | 'doctor-companion';