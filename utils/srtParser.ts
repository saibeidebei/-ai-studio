
import { SubtitleBlock } from '../types';

export function parseSRT(content: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  const rawBlocks = content.trim().split(/\n\s*\n/);

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length >= 3) {
      const id = lines[0].trim();
      const timestamp = lines[1].trim();
      const text = lines.slice(2).join('\n').trim();
      
      if (id && timestamp && text) {
        blocks.push({ id, timestamp, text });
      }
    }
  }
  return blocks;
}

export function stringifySRT(blocks: SubtitleBlock[]): string {
  return blocks
    .map((block) => `${block.id}\n${block.timestamp}\n${block.text}\n`)
    .join('\n');
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
