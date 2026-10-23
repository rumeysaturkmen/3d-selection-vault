export type Task = 'selection' | 'manipulation' | 'system-control' | 'navigation';

export interface AttributeValue {
  id: string;
  label: string;
}

export interface AttributeDef {
  id: string;
  label: string;
  description: string;
  basis: string;
  multiple: boolean;
  weight: number;
  values: AttributeValue[];
}

export interface PublicationLink {
  publication: string;
  role: 'introduced' | 'evaluated' | 'surveyed' | 'reference';
  where?: string;
}

export interface Relationship {
  technique: string;
  type: 'extends' | 'variant-of' | 'compared-with' | 'related';
  source?: string;
  note?: string;
}

export interface Media {
  type: 'image' | 'video' | 'demo' | 'code';
  url: string;
  caption?: string;
}

export interface Technique {
  id: string;
  name: string;
  aliases?: string[];
  year?: number | null;
  summary: string;
  howItWorks?: string;
  advantages?: string[];
  limitations?: string[];
  primaryTask: Task;
  tasks: Task[];
  attributes: Record<string, string[]>;
  tags?: string[];
  media?: Media[];
  publications: PublicationLink[];
  relationships?: Relationship[];
  review: { status: 'migrated' | 'draft' | 'reviewed'; reviewedBy?: string; notes?: string };
}

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  url?: string | null;
  type: 'paper' | 'survey' | 'thesis' | 'book' | 'other';
  citation?: string | null;
  bibtex?: string | null;
}
