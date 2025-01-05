import OpenAI from 'openai';
import { response, Response } from 'express';
import { ChatMessage, AIVoiceStreamOptions } from '../helpers/types';
import WebSocket from 'ws';
import { system_prompt_natural } from '../helpers/constant';

class AIVoiceStreamService {
  private readonly openai: OpenAI;
  private readonly elevenlabsApiKey: string;
  private readonly DEFAULT_MODEL = 'eleven_flash_v2_5';
  private readonly DEFAULT_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';
  private readonly SENTENCE_BREAK_REGEX = /[.!?]\s+/;

  constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!openaiApiKey) throw new Error('Missing OpenAI API Key');
    if (!elevenlabsApiKey) throw new Error('Missing ElevenLabs API Key');

    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.elevenlabsApiKey = elevenlabsApiKey;
  }

  private initializeWebSocket(voiceId: string, model: string): WebSocket {
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
    console.log('Initializing ElevenLabs WebSocket connection:', wsUrl);
    
    try {
      console.log(this.elevenlabsApiKey)
      return new WebSocket(wsUrl, {
        headers: { "xi-api-key": this.elevenlabsApiKey }
      });
    } catch (error) {
      console.error('Failed to initialize ElevenLabs WebSocket:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers(
    websocket: WebSocket,
    res: Response,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    websocket.on('error', (error) => {
      console.error('ElevenLabs WebSocket error:', {
        error: error.message,
        name: error.name,
        stack: error.stack
      });
      this.handleError(error, res, reject);
    });

    websocket.on('message', (data) => {
      try {
        const chunk = JSON.parse(data.toString());
        if (chunk.audio) {
          const audioBuffer = Buffer.from(chunk.audio, 'base64');
          res.write(audioBuffer);
        } else if (chunk.error) {
          console.error('ElevenLabs returned error in message:', chunk.error);
        }
      } catch (error) {
        console.error('Error processing ElevenLabs audio chunk:', {
          error,
          dataPreview: data.toString().substring(0, 100)
        });
      }
    });

    websocket.on('close', (code, message) => {
      console.log('ElevenLabs WebSocket closed:', { code, message });
      res.end();
      resolve();
    });
  }

  private async processOpenAIStream(
    textStream: AsyncIterable<any>,
    websocket: WebSocket,
    textBuffer: { current: string },
    processTextBuffer: () => void
  ): Promise<string> {
    try {
      let fullResponse = '';

      for await (const chunk of textStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          textBuffer.current += content;
          fullResponse += content;
          processTextBuffer();
        }
      }

      // Send remaining text
      if (textBuffer.current) {
        try {
          websocket.send(JSON.stringify({ text: textBuffer.current }));
        } catch (error) {
          console.error('Error sending final text buffer to ElevenLabs:', {
            error,
            textLength: textBuffer.current.length
          });
        }
      }

      // Signal end of stream
      try {
        websocket.send(JSON.stringify({ text: "" }));
      } catch (error) {
        console.error('Error sending end of stream signal to ElevenLabs:', error);
      }
      
      return fullResponse;

    } catch (error) {
      console.error('Error in OpenAI stream:', error);
      throw error;
    }
  }

  private handleError(error: Error, res: Response, reject: (error: Error) => void): void {
    console.error('AIVoiceStreamService error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (!res.headersSent) {
      res.status(500).json({ error: `Operation failed: ${error.message}` });
    }
    reject(error);
  }

  async generateVoiceStream(
    messages: ChatMessage[],
    res: Response,
    context: string,
    options: AIVoiceStreamOptions = {}
  ): Promise<string> {
    const {
      openaiModel = 'gpt-4o-mini',
      stability = 0.75,
      similarityBoost = 0.85,
      voiceId = this.DEFAULT_VOICE_ID
    } = options;

    console.log('Starting voice stream generation:', {
      voiceId,
      model: this.DEFAULT_MODEL,
      stability,
      similarityBoost,
      messageCount: messages.length
    });

    const fullMessages: any = [
      { role: "system", content: system_prompt_natural(context) },
      ...messages
    ];

    try {
      // Set streaming headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');

      const websocket = this.initializeWebSocket(voiceId, this.DEFAULT_MODEL);
      const textBuffer = { current: '' };
      let wsReady = false;

      const textStream = await this.openai.beta.chat.completions.stream({
        model: openaiModel,
        messages: fullMessages,
        stream: true,
      });

      return new Promise<string>((resolve, reject) => {
        this.setupWebSocketHandlers(websocket, res, () => {}, reject);

        websocket.on('open', () => {
          console.log('ElevenLabs WebSocket connection established');
          wsReady = true;
          try {
            websocket.send(JSON.stringify({
              text: " ",
              voice_settings: {
                stability,
                similarity_boost: similarityBoost,
                use_speaker_boost: true,
              }
            }));
          } catch (error) {
            console.error('Error sending initial settings to ElevenLabs:', error);
          }
        });

        websocket.on("error", (error) => {
          console.error("ElevenLabs WebSocket error:", {
            error: error.message,
            name: error.name,
            stack: error.stack
          });
        });
      
        const processTextBuffer = () => {
          if (!wsReady) {
            console.log('Waiting for WebSocket to be ready...');
            return;
          }
          
          if (textBuffer.current.length === 0) return;

          const sentences = textBuffer.current.split(this.SENTENCE_BREAK_REGEX);
          
          if (sentences.length > 1) {
            const completeText = sentences.slice(0, -1).join('. ') + '. ';
            try {
              websocket.send(JSON.stringify({ text: completeText }));
            } catch (error) {
              console.error('Error sending text to ElevenLabs:', {
                error,
                textLength: completeText.length
              });
            }
            textBuffer.current = sentences[sentences.length - 1];
          }
        };

        this.processOpenAIStream(textStream, websocket, textBuffer, processTextBuffer)
          .then(response => resolve(response))
          .catch(error => this.handleError(error, res, reject));
      });
    } catch (error: any) {
      console.error('Voice stream generation error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to generate voice stream: ${error.message}` });
      }
      throw error;
    }
  }
}

export default AIVoiceStreamService;