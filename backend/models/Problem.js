const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard'],
    },
    statement: {
        type: String,
        required: true,
        trim: true,
    },
    examples: [String],
    constraints: [String],
    testCases: [{
        input: {
            type: String,
            required: true,
        },
        expectedOutput: {
            type: String,
            required: true,
        },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);
