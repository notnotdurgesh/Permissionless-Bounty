import axios from 'axios';

const PARENT_URL = 'http://localhost:3000/'

export async function fetchMeeting() {
  try {
    const response = await axios.get(`${PARENT_URL}api/meeting/create`);
    return response.data; 
  } catch (error) {
    console.error('Error fetching meeting data:', error);
    throw error; // Re-throw the error for further handling
  }
}

export async function getAiResponse({data, meetingId, context}) {
    try {
      const response = await axios.post(`${PARENT_URL}api/ai/stream`);
      //use the buffer audio
    } catch (error) {
      console.error('Error fetching meeting data:', error);
      throw error; // Re-throw the error for further handling
    }
  }
  