const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    meetingId: { type: String, required: true },
    messages: [{
        _id: false, // This is the key change
        role: { type: String, required: true, enum: ['user', 'assistant'] },
        content: { type: String, required: true },
    }],
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;


