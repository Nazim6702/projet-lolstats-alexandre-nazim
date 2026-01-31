export type ChampionClassTag =
  | 'Fighter'
  | 'Tank'
  | 'Mage'
  | 'Assassin'
  | 'Marksman'
  | 'Support';

export type RoleFilter = 'ALL' | 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface DDragonChampionSummary {
  version: string;
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: ChampionClassTag[];
  image: { full: string };
}

export interface DDragonChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  image: { full: string };
}

export interface DDragonChampionDetails {
  id: string;
  name: string;
  title: string;
  lore: string;
  tags: string[];
  spells: DDragonChampionSpell[];
  passive: { name: string; description: string; image: { full: string } };
  image: { full: string };
}

export interface DDragonChampionListResponse {
  version: string;
  data: Record<string, DDragonChampionSummary>;
}

export interface DDragonChampionDetailsResponse {
  data: Record<string, DDragonChampionDetails>;
}
