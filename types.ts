
export interface SubtitleBlock {
  id: string;
  timestamp: string;
  text: string;
}

export interface TranslationResult {
  original: SubtitleBlock;
  translated: SubtitleBlock;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  TRANSLATING = 'TRANSLATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
