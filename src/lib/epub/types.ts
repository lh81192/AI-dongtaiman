/**
 * EPUB Types
 */

export interface EPUBChapter {
  id: string;
  title: string;
  href: string;
  content?: string;
}

export interface EPUBMedia {
  id: string;
  src: string;
  type: string;
  width?: number;
  height?: number;
}

export interface EPUBPage {
  index: number;
  images: EPUBMedia[];
  text: string;
  rawHtml?: string;
}

export interface EPUBMetadata {
  title: string;
  author?: string;
  language?: string;
  publisher?: string;
  cover?: string;
  description?: string;
}

export interface EPUBParseResult {
  metadata: EPUBMetadata;
  pages: EPUBPage[];
  chapters: EPUBChapter[];
  allImages: EPUBMedia[];
  baseUrl: string;
}
