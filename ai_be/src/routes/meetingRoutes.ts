import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Conversation from '../db/schema';

const router = express.Router();

router.get('/create', async (req: any, res: any) => { 
  const meetingId = uuidv4();
  try{
    const result = await Conversation.create({
      meetingId,
      messages: [],
      });  
    await result.save();

    res.status(200).json(
      { 
        msg: "Meeting Created Succesfully", 
        meetingId: meetingId
    });

  }catch(error: any){
    console.error(error)
    res.status(500).json({ error: 'Error creation of meeting' });

  }
  
});

export default router;