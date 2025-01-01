const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    reward: { type: Number, default: 5 },
});

module.exports = mongoose.model('Question', QuestionSchema);