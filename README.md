# Permissionless Bhaya's Bug Bounty

Welcome to the **Permissionless Bhaya's Bug Bounty** project! This repository includes both the **Frontend** and **Backend** of the application, built to provide a seamless experience for bug bounty hunters, powered by AI.

## Live Link:
You can check out the live version of the app here:  
[**Permissionless Bhaya's Bug Bounty Live**](https://meet-ai-frontend.vercel.app/)

## Tech Stack

### Frontend:
- **Next.js**: React-based framework for building optimized web applications.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **ShadCN**: A library for creating customizable and themeable UI components.

### Backend:
- **TypeScript**: A statically typed superset of JavaScript for better development experience.
- **Express.js**: A minimal and flexible Node.js web application framework.

### AI APIs Used:
- **OpenAI**: To handle AI-driven interactions and responses.
- **ElevenLabs**: Used for text-to-speech functionality with low latency.

## Demo Video
Check out the demo video to see how the app works in action:  
[Watch Demo Video](https://user-attachments/assets/1f288f40-f528-4358-8d3c-ce58210312c9)

## Running the Project Locally

### Frontend:
1. Navigate to the frontend directory:
   ```bash
   cd fe
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the frontend developmentserver:
   ```bash
   npm run dev
   ```

### Backend:
1. Navigate to the backend directory:
   ```bash
   cd ai_be
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile TypeScript code:
   ```bash
   npm run tsc
   ```
4. Start the backend server:
   ```bash
   npm start
   ```

### Environment Variables:
Ensure that the following environment variables are set up for both the frontend and backend to ensure proper functionality:
- API keys for **OpenAI** and **ElevenLabs**.
- Backend configurations for server URLs and other environment-specific variables.

## Known Issues:
- **API Rate Limiting**: Due to rate limits imposed by external APIs (OpenAI & ElevenLabs), the app may experience occasional bugs or timeouts.. Please bear with us, as we are actively working on improving the system.
- **Latency**: Streaming from AI APIs may introduce some latency, which can vary depending on network conditions.

## Future Plans:
- **MultipleAttendees**: Support for multiple meeting participants to improve collaboration.
- **Chat, Audio, and Video**: A chat-like feature with video and audio calls.
- **UI/UX Improvements**: Enhancements to the user interface for better user experience.
- **Account & Auth Integration**: Allow users to log in,, track their activities, and manage their accounts.
- **Code Optimization**: Ongoing improvements in code quality and performance.

## Technical Details:
- **StreamingTechnologies**: The app uses **ElevenLabs** and **OpenAI** for low-latency streaming, ensures fast interactions. However, network speed and API rate-limiting may affect performance.
- **WebSocket**: Used for real-time communication between the frontend and backend.

## Contrib

1. **Multiple Attendees**: Support for multiple meeting participants to improve collaboration.
2. **Chat, Audio, and Video**: A chat-like feature with video and audio calls.
3. **UI/UX Improvements**:Enhancements to the user interface for better user experience.
4. **Account & Auth Integration**:Allow users to log in, track their activities, and manage their accounts.
5. **Code Optimization**:Ongoing improvements in code quality and performance.

## Contributing:
- If you'd like to contribute, please fork the repository and submit a pull request.
- You can create issues in the GitHub repository to report bugs or suggest new features.

---
