
import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleBlock } from "../types";

const SYSTEM_INSTRUCTION = `你是一位世界顶级的专业视频字幕翻译家，拥有深厚的科学、技术和人文背景。
你的任务是将输入的英文 SRT 字幕翻译成优雅、地道且符合中文语境的简体中文。

严格执行以下规则：
1. **格式保持**：绝对保持原始编号 (ID) 和时间轴 (Timestamp) 不变。
2. **一对一对应**：每一条英文原文必须且只能对应一条中文译文。严禁合并、拆分、跨行或串行。
3. **内容替换**：输出的结果必须是完整的 SRT 格式，但文本部分仅保留中文，不包含任何英文原文。
4. **术语准确**：使用最专业的科学和行业标准译法。
5. **语境优化**：翻译应通顺且符合中文口语或书面语表达习惯，避免“翻译腔”。
6. **无余话**：只输出翻译后的 SRT 内容，不要有任何开场白或解释。

输入示例：
1
00:00:01,000 --> 00:00:04,000
We are analyzing the quantum entanglement.

输出示例：
1
00:00:01,000 --> 00:00:04,000
我们正在分析量子纠缠现象。`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function translateSrtChunks(blocks: SubtitleBlock[], onProgress: (count: number) => void): Promise<SubtitleBlock[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const chunkSize = 20; 
  const translatedBlocks: SubtitleBlock[] = [];
  const maxRetries = 3;

  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    const chunkContent = chunk.map(b => `${b.id}\n${b.timestamp}\n${b.text}`).join('\n\n');
    
    let attempt = 0;
    let success = false;

    while (attempt <= maxRetries && !success) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: chunkContent }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
          },
        });

        const translatedText = response.text || '';
        const parsedResults = parseTranslatedOutput(translatedText, chunk);
        
        translatedBlocks.push(...parsedResults);
        onProgress(translatedBlocks.length);
        success = true;
      } catch (error: any) {
        attempt++;
        console.error(`Translation attempt ${attempt} failed for chunk starting at ${i}:`, error);
        
        if (attempt > maxRetries) {
          throw new Error(`在尝试 ${maxRetries} 次后，翻译片段（始于第 ${i + 1} 条）仍然失败。请检查网络或稍后重试。详细错误: ${error.message}`);
        }
        
        // Exponential backoff: 2s, 4s, 8s...
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
      }
    }
  }

  return translatedBlocks;
}

function parseTranslatedOutput(output: string, originalChunk: SubtitleBlock[]): SubtitleBlock[] {
  const lines = output.trim().split(/\n\s*\n/);
  const result: SubtitleBlock[] = [];

  for (let idx = 0; idx < originalChunk.length; idx++) {
    const orig = originalChunk[idx];
    const rawBlock = lines[idx];
    
    if (rawBlock) {
      const blockLines = rawBlock.split('\n');
      if (blockLines.length >= 3) {
         result.push({
           id: orig.id,
           timestamp: orig.timestamp,
           text: blockLines.slice(2).join('\n').trim()
         });
         continue;
      }
    }
    
    result.push({
      id: orig.id,
      timestamp: orig.timestamp,
      text: rawBlock?.split('\n')?.pop()?.trim() || orig.text
    });
  }

  return result;
}
