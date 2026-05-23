export type LegalContentBlock =
  | {
      type: 'paragraph';
      lines: string[];
    }
  | {
      type: 'list';
      items: string[];
    };

export type LegalContent = {
  sections: Array<{
    heading?: string;
    blocks: LegalContentBlock[];
  }>;
};
