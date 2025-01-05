export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UserMessage {
  role: 'user' 
  content: string;
}

export interface AIVoiceStreamOptions {
  openaiModel?: string;
  geminiModel?: string;
  elevenLabsVoiceId?: string;
  stability?: number;
  similarityBoost?: number;
  voiceId?: string;
  chunkSize?: number
}
