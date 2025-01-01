const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { callOpenAIAPI } = require('../utils/openAI'); // Correct path to your Axios setup  

// Get all questions
router.get('/', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Add a new question
router.post('/', async (req, res) => {
    const { question, options, correctAnswer, reward } = req.body;
    try {
        const newQuestion = new Question({ question, options, correctAnswer, reward });
        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Generate questions using Azure OpenAI
router.post('/generate', async (req, res) => {
    const { topic, difficulty, questionsCount } = req.body;

    try {
        
        const prompt = ` 
                        Generate ${questionsCount} ${difficulty} level multiple-choice questions on the topic of "${topic}". 
                        Each question must follow this format strictly:

                        1. Question: A clear and concise question text.
                        Options:
                        A) Option 1
                        B) Option 2
                        C) Option 3
                        D) Option 4
                        Correct Answer: Provide the correct option as one of A, B, C, or D.

                        Ensure:
                        - Each question starts with a number followed by a period (e.g., "1.", "2.").
                        - Each question is clearly separated by a blank line for easy distinction.
                        - The questions are directly relevant to the topic and logically structured.
                        - Each question has four distinct and meaningful options.
                        - The correct answer is explicitly provided as "Correct Answer: X".
                        - If applicable, include cultural or domain-specific context (e.g., terms, instruments, or notable figures).

                        Example Output:
                        1. Question: What is the capital of France?
                        Options:
                        A) Berlin
                        B) Madrid
                        C) Paris
                        D) Rome
                        Correct Answer: C

                        2. Question: Which element has the chemical symbol O?
                        Options:
                        A) Oxygen
                        B) Hydrogen
                        C) Carbon
                        D) Nitrogen
                        Correct Answer: A

                        Do not deviate from this format. Ensure there are no missing or malformed sections. Include one blank line between each question.

                        `;

        console.log("Prompt >>>> " + prompt);

        let result;
        try {
            result = await callOpenAIAPI(prompt);
        } catch (error) {
            console.error("Error calling OpenAI API:", error);
            return res.status(500).json({ message: 'Error generating questions' });
        }
        const generatedText = result.choices[0]?.message?.content;
        console.log("Generated Text (Raw) >>>>", JSON.stringify(generatedText));

        if (!generatedText) {
            console.error("Error: Generated text is missing from the API response.");
            return res.status(500).json({ message: 'Invalid response from OpenAI API' });
        }

        // Split into individual question blocks
        const questionBlocks = generatedText.split(/\n(?=\d+\.)/).filter(block => block.trim());
        console.log("Question Blocks >>>>", questionBlocks);

        const questions = questionBlocks.map((block, index) => {
            try {

                console.log("Block Data >>>>>>> ", block);
                
                // Extract the question text
                const questionMatch = block.match(/^\s*\d+\.\s*Question:\s*(.+?)\s*(?:\r?\n|$)/);

                console.log("Question Match >>>>> ", questionMatch);
                

                // Extract the options
                const optionsMatch = block.match(
                    /Options:\s*A[.)]\s*(.+?)\n\s*B[.)]\s*(.+?)\n\s*C[.)]\s*(.+?)\n\s*D[.)]\s*(.+?)(?:\n|$)/s
                  );

                console.log("options Match >>>> ", optionsMatch);
                // Extract the correct answer
                const correctAnswerMatch = block.match(/Correct Answer:\s*([A-D])/i);

                console.log("correctAnswerMatch >>>>> ", correctAnswerMatch);

                // Extract the question text
                const questionText = questionMatch ? questionMatch[1].trim() : '';

                console.log("Question Text >>>>>> ", questionText);

                // Ensure the options are extracted correctly and safely
                const options = optionsMatch 
                ? [
                    `A) ${optionsMatch[1]?.trim() || ''}`,
                    `B) ${optionsMatch[2]?.trim() || ''}`,
                    `C) ${optionsMatch[3]?.trim() || ''}`,
                    `D) ${optionsMatch[4]?.trim() || ''}`,
                    ]
                : [];

                console.log("Options >>>>>>> ", options);

                // Extract the correct answer
                const correctAnswer = correctAnswerMatch 
                ? `Correct answer: ${correctAnswerMatch[1]}` 
                : 'Correct answer: Not found';

                console.log("Correct Answer >>>>>> ", correctAnswer);

                // Validate extracted parts
                if (!questionMatch || !optionsMatch || !correctAnswerMatch) {
                    console.warn(`Invalid question block skipped: ${block}`);
                    return null;
                }

                return {
                    question: questionText,
                    options,
                    correctAnswer,
                    reward: "chocolate", // Reward can be customized
                };
            } catch (error) {
                console.error(`Error parsing question block at index ${index}:`, error);
                return null;
            }
        }).filter(Boolean); // Filter out invalid questions

        if (questions.length === 0) {
            console.error("No valid questions generated.");
            return res.status(500).json({ message: 'No valid questions generated' });
        }

        console.log("Parsed Questions >>>>", JSON.stringify(questions, null, 2));
        res.json({ questions });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Error generating questions' });
    }
});


router.post('/regenerate', async (req, res) => {
    const { topic, difficulty, questionsCount } = req.body;

    try {
        // Example: Fetch all questions from the data store (static or database)
        const allQuestions = [
            { question: "Question 1", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "A" },
            { question: "Question 2", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "B" },
            // Add the remaining 48 questions here...
            { question: "Question 50", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "D" }
        ];

        // Randomly select 'questionsCount' number of questions
        const randomQuestions = getRandomQuestions(allQuestions, questionsCount);

        // Format the selected questions in the same structure OpenAI returned
        const formattedQuestions = randomQuestions.map((q, index) => {
            try {
                // Extract the question, options, and correct answer
                const questionText = q.question.trim();
                const options = [
                    `A) ${q.options[0].trim()}`,
                    `B) ${q.options[1].trim()}`,
                    `C) ${q.options[2].trim()}`,
                    `D) ${q.options[3].trim()}`
                ];
                const correctAnswer = `Correct answer: ${q.correctAnswer}`;

                // Log the extracted details
                console.log(`Formatted Question ${index + 1}:`, questionText, options, correctAnswer);

                // Return the formatted question in the desired structure
                return {
                    question: questionText,
                    options: options,
                    correctAnswer: correctAnswer,
                    reward: "chocolate" // Reward can be customized
                };
            } catch (error) {
                console.error(`Error parsing question at index ${index}:`, error);
                return null;
            }
        }).filter(Boolean); // Filter out any invalid questions

        // Send the formatted questions to the UI layer
        res.json({ questions: formattedQuestions });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Error generating questions' });
    }
});

// Helper function to randomly select 'count' questions from the list
function getRandomQuestions(allQuestions, count) {
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()); // Shuffle the array
    return shuffled.slice(0, count); // Return the first 'count' questions
}






module.exports = router;