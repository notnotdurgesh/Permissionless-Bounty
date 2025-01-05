import express from 'express';
import AIVoiceStreamService from '../openaiElevenLabs/AIVoiceStreamService';
import { UserMessage } from '../helpers/types';
import Conversation from '../db/schema';
import { system_prompt_natural } from '../helpers/constant';
import { OpenAI } from 'openai';
import sharp from 'sharp'; // For image processing and base64 conversion
const router = express.Router();
const aiVoiceService = new AIVoiceStreamService();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
// Initialize OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('Missing OpenAI API Key');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

router.post('/stream', async (req: any, res: any) => {
  try {
    const { data, meetingId, context } = req.body;
    if (!data || !meetingId) {
      return res.status(400).json({ error: 'Invalid message or user ID' });
    }
    const userMessage: UserMessage = { role: 'user', content: data };

    let existingConversation = await Conversation.findOne({ meetingId });

    if (existingConversation) {
      existingConversation.messages.push(userMessage);
      const response: string = await aiVoiceService.generateVoiceStream(existingConversation.messages, res, JSON.stringify(context) || "");
      console.log(response)
      existingConversation.messages.push({ role: 'assistant', content: response || "" });
      await existingConversation.save();
      console.log('Conversation saved successfully!');

    } else {
      res.status(401).json({ error: 'Meeting room not Found' });
    }

  } catch (error) {
    console.error('Streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});


router.post('/analyze-image-stream', async (req: any, res: any) => {
  try {
    const { meetingId, question, images } = req.body;

    if (!images || !meetingId || !question) {
      return res.status(400).json({ error: 'Invalid or missing fields' });
    }
    const processedImages = await Promise.all(
      images.map(async (file: any) => {
        return {
          type: "image_url",
          image_url: {
            url: file,
            detail: "auto"
          }
        };
      })
    );
    
    // Create the user message with both text and images
    const userMessage = {
      role: 'user',
      content: [
        { type: "text", text: question },
        ...processedImages
      ]
    };

    // Get or create conversation
    let conversation = await Conversation.findOne({ meetingId });
    if (!conversation) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    // Create messages array for OpenAI
    const messages: any = [
      {
        role: 'system',
        content: "You are an AI assistant capable of analyzing images and providing detailed responses. Please analyze the provided images and address the user's questions specifically about what you see in them."
      }
    ];

    // Add previous messages if they exist and are valid
    if (conversation.messages && Array.isArray(conversation.messages)) {
      conversation.messages.forEach((msg: any) => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add the new message
    messages.push(userMessage);


    // Log the final messages for debugging
    console.log('Messages being sent to OpenAI:', JSON.stringify(messages, null, 2));

    // Set streaming headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Voice generation options
    const voiceOptions = {
      openaiModel: 'gpt-4o-mini',
      stability: 0.75,
      similarityBoost: 0.85,
      voiceId: 'Xb7hH8MSUJpSbSDYk0k2'
    };

    // Generate voice stream
    await aiVoiceService.generateVoiceStream(messages, res, '', voiceOptions);

  } catch (error: any) {
    console.error('Image analysis and audio streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  }
});

export default router;