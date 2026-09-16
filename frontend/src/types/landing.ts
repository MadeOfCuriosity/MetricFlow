export type CursorState = 'default' | 'drag' | 'view' | 'read' | 'hover';

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  tags: string[];
  coverColor: string;
  accentColor: string;
  spineColor: string;
  author?: string;
  badge?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  svgType: string;
}

