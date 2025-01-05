import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose'; 
import aiVoiceRoutes from './routes/aiVoiceRoutes';
import transcriptionRouter from './routes/meetingRoutes';
import path from 'path'; // Import path module

dotenv.config({ override: true });

const app = express();

app.use(cors())

app.use(express.json({ limit: '100mb' }));  // Increase the limit
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'None';


console.log(mongoUri)
// Connect to MongoDB
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process on connection error
  });


// Serve static files
app.use(express.static(path.join(__dirname, 'index'))); // Use path.join for cross-platform compatibility

// Routes
app.use('/api/ai', aiVoiceRoutes);
app.use('/api/meeting', transcriptionRouter);

// Centralized Error Handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack); // Log the error stack trace
  res.status(500).send('Something went wrong!');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
    mongoose.connection.close(false);
    console.log('MongoDb connection closed.');
    process.exit(0);

  });
});