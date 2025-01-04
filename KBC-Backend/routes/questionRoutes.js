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
    const { topic, difficulty, questionsCount, selectedMusic } = req.body;

    try {

        let selectedQuestions = [];

 
        // Example: Fetch all questions from the data store (static or database)
        const questionsByCategory  = { "Carnatic music": [
           
            { 
                question: "Who is known as the 'Father of Carnatic Music'?", 
                options: ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Purandaradasa"], 
                correctAnswer: "D" 
            },
            { 
                question: "Which of these is the first note in the Carnatic scale?", 
                options: ["Ri", "Pa", "Sa", "Ma"], 
                correctAnswer: "C" 
            },
            { 
                question: "What is 'Shruti' in Carnatic music?", 
                options: ["Melody", "Rhythmic pattern", "Pitch or tonal foundation", "Lyrics"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which of the following is a key Carnatic percussion instrument?", 
                options: ["Tabla", "Mridangam", "Congo", "Dholak"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of these is a composition form in Carnatic music?", 
                options: ["Varnam", "Raga", "Tala", "Shruti"], 
                correctAnswer: "A" 
            },
            { 
                question: "'Tala' refers to:", 
                options: ["Tempo", "Cyclic rhythmic pattern", "Lyrics", "Beats"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of these is considered a fixed composition in Carnatic music?", 
                options: ["Alapana", "Kriti", "Tani Avartanam", "Raga"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which Carnatic composer’s pancharatnams are celebrated more?", 
                options: ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Subbaraya Shastri"], 
                correctAnswer: "A" 
            },
            { 
                question: "Which raga is similar to Bilawal of Hindustani music?", 
                options: ["Bhairavi", "Hamsadhwani", "Shankarabharanam", "Yaman"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which Carnatic raga is a 5 note raga?", 
                options: ["Hamsadhwani", "Todi", "Shankarabharanam", "Bhairavi"], 
                correctAnswer: "A" 
            },
            { 
                question: "What does 'Alapana' refer to in Carnatic music?", 
                options: ["Rhythmic improvisation", "Melodic improvisation", "Fixed composition", "A dance form"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of these is NOT a Carnatic musical instrument?", 
                options: ["Violin", "Veena", "Piano", "Flute"], 
                correctAnswer: "C" 
            },
            { 
                question: "The 'Anupallavi' in a Carnatic composition is:", 
                options: ["The introduction", "The main section", "The concluding section", "The supporting section"], 
                correctAnswer: "D" 
            },
            { 
                question: "Which of these Carnatic composers is known for his Sanskrit compositions?", 
                options: ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Subbaraya Shastri"], 
                correctAnswer: "B" 
            },
            { 
                question: "What is 'Gamaka' in Carnatic music?", 
                options: ["A rhythmic cycle", "An ornamentation or embellishment of a note", "A type of raga", "A drone instrument"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of these is chaturasrajati Triputa Talam in Carnatic music?", 
                options: ["Jampa", "Roopaka", "Adi", "Ata"], 
                correctAnswer: "C" 
            },
            { 
                question: "What is 'Tani Avartanam' in Carnatic music?", 
                options: ["A vocal improvisation", "A rhythm cycle", "A percussion solo", "A form of raga"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which raga is considered as a major raga in Carnatic concerts?", 
                options: ["Tilang", "Bhairavi", "Kapi", "Des"], 
                correctAnswer: "B" 
            },
            { 
                question: "What is the role of the 'Tambura' in Carnatic music?", 
                options: ["To play the melody", "To provide rhythmic support", "To create a drone sound", "To accompany vocals"], 
                correctAnswer: "C" 
            },
            { 
                question: "Who composed Navaratri kritis?", 
                options: ["Muthuswami Dikshitar", "Tyagaraja", "Shyama Sastri", "Subbaraya Shastri"], 
                correctAnswer: "A" 
            },
            { 
                question: "What is trisra jati Ata talam?", 
                options: ["8", "12", "10", "14"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which of these is a major form of vocal Carnatic music composition?", 
                options: ["Varnam", "Tani Avartanam", "Alapana", "Sargam"], 
                correctAnswer: "A" 
            },
            { 
                question: "'Sahitya' refers to what in Carnatic music?", 
                options: ["Melody", "Rhythmic pattern", "Lyrics", "Ornamentation"], 
                correctAnswer: "C" 
            },
            { 
                question: "What is the Main manodharma aspect in Carnatic music?", 
                options: ["Sahityam", "Keertana", "Pallavi", "All"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which of these is NOT a type of raga?", 
                options: ["Audava", "Shadava", "Plutham", "Vakra"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which raga is considered as 'happy and light' in a very general sense?", 
                options: ["Bhairavi", "Kapi", "Todi", "Shankarabharanam"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of these instruments is NOT commonly accompanied in Carnatic music concert?", 
                options: ["Mridangam", "Sarangi", "Violin", "Flute"], 
                correctAnswer: "B" 
            },
            { 
                question: "Who is the composer famous for his swarajathis?", 
                options: ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Purandaradasa"], 
                correctAnswer: "C" 
            },
            { 
                question: "Which raga is considered as Morning raga in Carnatic concerts?", 
                options: ["Todi", "Bhouli", "Hamsadhwani", "Saranga"], 
                correctAnswer: "B" 
            },
            { 
                question: "Which of the following is a rhythmic cycle (Tala) in Carnatic music?", 
                options: ["Adi Tala", "Choutal", "Teen Taal", "Aada Taal"], 
                correctAnswer: "A" 
            },


            // The remaining questions can be added in a similar format...

            {
                "question": "Who composed the Kriti in the raga ‘Gamanasrama’?",
                "options": ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Subbaraya Shastri"],
                "correctAnswer": "B"
            },
            {
                "question": "What is the role of 'Mridangam' in Carnatic music?",
                "options": ["To play the melody", "To provide rhythmic support", "To produce the drone sound", "To deviate the vocals"],
                "correctAnswer": "B"
            },
            {
                "question": "What is a 'Pallavi' in a Carnatic music composition?",
                "options": ["The middle section", "The final section", "The introductory section", "The second section of the composition"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these ragas is mostly used for 'sad' or 'melancholic' moods in Carnatic music?",
                "options": ["Hamsadhwani", "Sivaranjani", "Yaman", "Todi"],
                "correctAnswer": "B"
            },
            {
                "question": "Which is the smallest time unit in Carnatic rhythm?",
                "options": ["Matra", "Tala", "Laya", "Shruti"],
                "correctAnswer": "A"
            },
            {
                "question": "Rasas in music",
                "options": ["8", "9", "7", "10"],
                "correctAnswer": "B"
            },
            {
                "question": "Pancham is varjit in:",
                "options": ["Yaman", "Todi", "Malkauns", "Sankara"],
                "correctAnswer": "C"
            },
            {
                "question": "What is the standard number of beats in 'Adi Tala'?",
                "options": ["6", "8", "10", "12"],
                "correctAnswer": "B"
            },
            {
                "question": "Nowka Charitham is composed by:",
                "options": ["Veena Kuppayyar", "Bharatiyar", "Tyagaraja", "Papanasan Sivan"],
                "correctAnswer": "C"
            },
            {
                "question": "Kalpita Sangitam is:",
                "options": ["Improvised music", "Pre-Composed music", "Melodic content", "Devotional music"],
                "correctAnswer": "B"
            },
            {
                "question": "Who composed the famous 'Nagumomu' kriti?",
                "options": ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Purandaradasa"],
                "correctAnswer": "A"
            },
            {
                "question": "Dikshitar’s 'Chandram Bhaja Manasa' is a ----------kriti?",
                "options": ["Navavarna", "Panchalinga", "Navagraha", "None"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these is a 'Varnam' in Carnatic music?",
                "options": ["A fixed pattern of swaras", "Voice exercise", "A musical form", "A dance form"],
                "correctAnswer": "C"
            },
            {
                "question": "Annamayya compositions are also known as:",
                "options": ["Churnikas", "Sankirtanas", "Dandakams", "Pasurams"],
                "correctAnswer": "B"
            },
            {
                "question": "The form of Rupak Taal in Carnatic music is:",
                "options": ["1 U O", "1 O U", "O 1", "1 O"],
                "correctAnswer": "C"
            },
            {
                "question": "The 'Tani Avartanam' is a rhythmic section performed by which instrument?",
                "options": ["Violin", "Flute", "Mridangam", "Tambura"],
                "correctAnswer": "C"
            },
            {
                "question": "What is the importance of 'Shruti' in Carnatic music?",
                "options": ["It determines the tempo", "It determines the pitch", "It provides rhythm support", "It is a vocal technique"],
                "correctAnswer": "B"
            },
            {
                "question": "Veena has how many frets?",
                "options": ["22", "24", "23", "26"],
                "correctAnswer": "B"
            },
            {
                "question": "Who is known for composing in Anandabhairavi raga?",
                "options": ["Tyagaraja", "Muthuswami Dikshitar", "Shyama Sastri", "Purandaradasa"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these is the highest note in the Carnatic scale?",
                "options": ["Pa", "Ri", "Ga", "Ni"],
                "correctAnswer": "D"
            },
            {
                "question": "What is the main feature of 'Svara Kalpana' in Carnatic music?",
                "options": ["Rhythmic structures", "Improvisation of musical notes within the raga", "Fixed composition", "Dance performance"],
                "correctAnswer": "B"
            },
            {
                "question": "Which one is not a Rasa:",
                "options": ["Adhbhuta", "Karunya", "Ahlaada", "Bhibhatsa"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of the following ragas is similar to major scale in western music?",
                "options": ["Todi", "Bairavi", "Yaman", "Shankarabharanam"],
                "correctAnswer": "D"
            },
            {
                "question": "The 'Varnam' has how many sections?",
                "options": ["One", "Two", "Three", "Four"],
                "correctAnswer": "B"
            },
            {
                "question": "Mudra 'Padumanabha' is used by?",
                "options": ["Tyagaraja", "Swati Tirunal", "Padma Bharati", "Papanasan Sivan"],
                "correctAnswer": "B"
            },
            {
                "question": "Which is the equivalent scale to 'Malkauns' in Hindustani music?",
                "options": ["Todi", "Hindola", "Durga", "Bilawal"],
                "correctAnswer": "B"
            },
            {
                "question": "Which is similar to Tillana:",
                "options": ["Tarana", "Qawwali", "Raga", "Lyrics"],
                "correctAnswer": "A"
            },
            {
                "question": "Which of these is a form of improvisation in Carnatic music?",
                "options": ["Kriti", "Varnam", "Alapana", "Tani Avartanam"],
                "correctAnswer": "C"
            },
            {
                "question": "Khanda jati eka talam:",
                "options": ["4", "5", "6", "7"],
                "correctAnswer": "B"
            },
            {
                "question": "'Tani Avartanam' is a rhythm section performed by:",
                "options": ["Vocalist", "Flute", "Mridangam", "Violin"],
                "correctAnswer": "C"
            },
            {
                "question": "'Swaras' in Carnatic music are:",
                "options": ["Melody notes", "Rhythmic cycles", "Composition forms", "Fixed compositions"],
                "correctAnswer": "A"
            },
            {
                "question": "Which of these is used to keep the rhythm in Carnatic music?",
                "options": ["Veena", "Mridangam", "Violin", "Tambura"],
                "correctAnswer": "B"
            },
            {
                "question": "'Charanam' in Carnatic music refers to which part of kriti?",
                "options": ["The opening section", "The middle section", "The ending section", "A rhythmic variation"],
                "correctAnswer": "C"
            },
            {
                "question": "A decorative anga which comprises both sahitya and sangita:",
                "options": ["Jati", "Solkattu swaram", "Yati", "Swara Sahityam"],
                "correctAnswer": "D"
            },
            {
                "question": "Natya Sastra is written by:",
                "options": ["Bharata", "Lochana", "Dixitar", "Srinivasa"],
                "correctAnswer": "A"
            },
            {
                "question": "What is Yati pattern in the below?",
                "options": ["Ganayati", "Gopuccha", "Sankara", "Vishnu"],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these is a Gamaka?",
                "options": ["Champaka", "Kallola", "Srihitha", "Kampita"],
                "correctAnswer": "D"
            },
            {
                "question": "What does 'Sangeetam' mean in Carnatic music?",
                "options": ["Gitam, Prabandham", "Gaanam, Gamakam", "Gitam, Vadyam, Nrityam", "Kampitam, Leenam"],
                "correctAnswer": "C"
            },
            {
                "question": "The Melakarta in Carnatic music is similar to:",
                "options": ["Paat", "Thaat", "Taal", "Swara"],
                "correctAnswer": "B"
            },
            {
                "question": "Mudra of Dixitar?",
                "options": ["Sriguha", "Dixita", "Guruguha", "Vitthala"],
                "correctAnswer": "C"
            },
            {
                "question": "Similar ragas:",
                "options": ["Todi, Hindola", "Yaman, Kalyani", "Bhouli, Des", "Deepak, Arabhi"],
                "correctAnswer": "B"
            },
            {
                "question": "Place them in order?",
                "options": ["Trisra, Misra, Chaturasra, Sankirna", "Snakirana, Trisra, Chaturasra, Misra", "Trisra, Chaturasra, Misra, Sankirna", "None"],
                "correctAnswer": "C"
            },
            {
                "question": "Missing swaras in Mohana:",
                "options": ["Ga, Ni", "Ma, Ni", "Ri, Da", "Ma, Da"],
                "correctAnswer": "B"
            },
            {
                "question": "Ashtotthara talas refer to:",
                "options": ["8", "108", "18", "88"],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these is sung after Tanam in Manodharmam?",
                "options": ["Ragam", "Pallavi", "Swarakalpana", "Mangalam"],
                "correctAnswer": "B"
            }
        ],
        "Hindustani classical music" : [
            {
                "question": "What is the first note of the Hindustani music scale?",
                "options": ["Re", "Ga", "Sa", "Ni"],
                "correctAnswer": "C"
            },
            {
                "question": "Which instrument is most commonly used in Hindustani classical music for melody?",
                "options": ["Tabla", "Violin", "Sitar", "Pakhawaj"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these is a prominent rhythmic instrument in Hindustani music?",
                "options": ["Tabla", "Flute", "Sitar", "Violin"],
                "correctAnswer": "A"
            },
            {
                "question": "What is referred to as gamaka in the following?",
                "options": ["Khayal", "Meend", "Lyrics", "Thaat"],
                "correctAnswer": "B"
            },
            {
                "question": "How does 'Tala' is executed in Hindustani music?",
                "options": ["Hands", "Bol", "Fingers", "Gestures"],
                "correctAnswer": "B"
            },
            {
                "question": "Who is the singer of Akbar's court?",
                "options": ["Pandit Ravi Shankar", "Ustad Zakir Hussain", "Tansen", "Pandit Bhimsen Joshi"],
                "correctAnswer": "C"
            },
            {
                "question": "What is the smallest rhythmic unit in Hindustani music?",
                "options": ["Laghu", "Tali", "Matra", "Khali"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these ragas is usually performed in the morning?",
                "options": ["Raga Yaman", "Raga Bhairav", "Raga Hamsadhwani", "Raga Desh"],
                "correctAnswer": "B"
            },
            {
                "question": "What is the name of the drone instrument used in Hindustani music?",
                "options": ["Tabla", "Sitar", "Tanpura", "Sarod"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of these is a type of Tala?",
                "options": ["Ektaal", "Desh", "Bhairavi", "Khayal"],
                "correctAnswer": "A"
            },
            {
                "question": "In Hindustani classical music, 'Alap' refers to:",
                "options": [
                    "A rhythmic pattern",
                    "An improvisational section of notes without lyrics",
                    "A composition with lyrics",
                    "A type of drum"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "What is 'Bandish' in Hindustani music?",
                "options": ["A type of raga", "A fixed composition with lyrics", "A rhythmic cycle", "An ornamentation of notes"],
                "correctAnswer": "B"
            },
            {
                "question": "Which raga is generally performed in the evening in Hindustani music?",
                "options": ["Raga Hamsadhwani", "Raga Marwa", "Raga Yaman", "Raga Bhairavi"],
                "correctAnswer": "C"
            },
            {
                "question": "'Swaras' refers to:",
                "options": ["Melody notes", "Rhythmic cycles", "Instrumental pieces", "The tempo"],
                "correctAnswer": "A"
            },
            {
                "question": "Which of these is a type of vocal composition in Hindustani music?",
                "options": ["Dhrupad", "Tabla", "Sarangi", "Sitar"],
                "correctAnswer": "A"
            },
            {
                "question": "What does 'Komal' swar refer to in Hindustani music?",
                "options": ["A rhythmic cycle", "Lower variety of note", "Higher variety", "Teevra note"],
                "correctAnswer": "B"
            },
            {
                "question": "The 'Tabla' consists of how many drums?",
                "options": ["One", "Two", "Three", "Four"],
                "correctAnswer": "B"
            },
            {
                "question": "The first basic note in Hindustani music?",
                "options": ["Shadaj", "Rishabh", "Pancham", "Nishad"],
                "correctAnswer": "A"
            },
            {
                "question": "The parent ragas in Hindustani music:",
                "options": ["Melakartas", "Raginis", "Thaat", "Ragang"],
                "correctAnswer": "C"
            },
            {
                "question": "What is 'Taan' in Hindustani music?",
                "options": ["Rhythmic bol", "Fast melodic runs", "A type of raga", "A type of tala"],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these is NOT a type of Hindustani vocal music?",
                "options": ["Dhrupad", "Thumri", "Khayal", "Bayan"],
                "correctAnswer": "D"
            },
            {
                "question": "Who is considered a pioneer of the Sitar in Hindustani classical music?",
                "options": ["Zakir Hussain", "Pandit Ravi Shankar", "Ustad Amjad Ali Khan", "Pandit Bhimsen Joshi"],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these ragas is generally performed in the monsoon season?",
                "options": ["Raga Hamsadhwani", "Raga Marwa", "Raga Miyan ki Todi", "Raga Desh"],
                "correctAnswer": "D"
            },
            {
                "question": "What is the rhythm cycle of 'Teental'?",
                "options": ["3 beats", "4 beats", "8 beats", "16 beats"],
                "correctAnswer": "D"
            },
            {
                "question": "'Raga Yaman' is a raga associated with which time of day?",
                "options": ["Morning", "Afternoon", "Evening", "Night"],
                "correctAnswer": "C"
            },
            {
                "question": "In Hindustani music, what is a 'Gharana'?",
                "options": ["A type of raga", "A school or tradition of music", "A type of rhythm", "A kind of instrument"],
                "correctAnswer": "B"
            },
            {
                "question": "The term 'Dhrupad' refers to:",
                "options": ["A slow style of singing", "A rhythmic cycle", "A form of dance", "A type of instrument"],
                "correctAnswer": "A"
            },
            {
                "question": "What is 'Gat' in Hindustani music?",
                "options": ["A form of rhythmic improvisation", "A type of raga", "A fixed composition in instrumental music", "A form of vocal ornamentation"],
                "correctAnswer": "C"
            },
            {
                "question": "Which of the following is a major instrument used in Hindustani classical music for rhythm?",
                "options": ["Sarangi", "Pakhawaj", "Harmonium", "Tanpura"],
                "correctAnswer": "B"
            },
            {
                "question": "'Vilambit Khayal' refers to:",
                "options": [
                    "A slow, serious rendition of a composition",
                    "A rhythmic pattern",
                    "A short form of raga",
                    "A lyrical composition"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "\"Chhota Khayal\" is:",
                "options": [
                    "A slow composition in Hindustani music",
                    "A form of ornamentation",
                    "A shorter, lighter composition",
                    "A type of raga"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "Who is considered one of the greatest tabla players in Hindustani music?",
                "options": [
                    "Zakir Hussain",
                    "Lata Mangeshkar",
                    "Ravi Shankar",
                    "Ustad Amjad Ali Khan"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Which raga is typically performed during the night?",
                "options": [
                    "Raga Hamsadhwani",
                    "Raga Bhairav",
                    "Raga Jaijaiwanti",
                    "Raga Marwa"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "The instrument \"Sarod\" is similar to the:",
                "options": [
                    "Violin",
                    "Flute",
                    "Sitar",
                    "Tabla"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "Raag Bhupali is similar to which Carnatic Raga?",
                "options": [
                    "Kalyani",
                    "Mohana",
                    "Todi",
                    "Saveri"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these instruments is not used in Hindustani music?",
                "options": [
                    "Tanpura",
                    "Tabla",
                    "Sitar",
                    "Mridangam"
                ],
                "correctAnswer": "D"
            },
            {
                "question": "What is \"Khali\" in Hindustani music?",
                "options": [
                    "The final beat of a tala",
                    "A type of raga",
                    "A form of vocalization",
                    "A type of instrument"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "What is \"Jhala\" in a raga performance?",
                "options": [
                    "A slow improvisation",
                    "A rhythmic variation",
                    "A fast and energetic section of a raga",
                    "A vocal ornamentation"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "The \"Alaap\" section of a raga is:",
                "options": [
                    "Pre-composed",
                    "The rhythm section",
                    "Extempore improvisation",
                    "The final section"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "\"Alankar\" in Hindustani music refers to:",
                "options": [
                    "Rhythmic patterns",
                    "Swara exercises",
                    "Instruments",
                    "Compositions"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Most of vilambit khayals are composed in:",
                "options": [
                    "Vilambit dadra",
                    "Vilambit teentaal",
                    "Dhamar",
                    "Bhajan taal"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "\"Pakhawaj\" is:",
                "options": [
                    "A wind instrument",
                    "A string instrument",
                    "A type of drum",
                    "A keyboard instrument"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "The \"Raga\" in Hindustani classical music expresses:",
                "options": [
                    "Rhythm only",
                    "Emotions through melody",
                    "The drone",
                    "Percussion patterns"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "What is \"Sargam\" in Hindustani music?",
                "options": [
                    "A type of rhythm",
                    "Swara combinations",
                    "A type of tala",
                    "Raga"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Who was known for popularizing the \"Sitar\" in the West?",
                "options": [
                    "Pandit Ravi Shankar",
                    "Zakir Hussain",
                    "Ustad Amjad Ali Khan",
                    "Lata Mangeshkar"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "The rhythmic cycle \"Teen Taal\" consists of:",
                "options": [
                    "8 beats",
                    "16 beats",
                    "12 beats",
                    "6 beats"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "\"Tumbi\" is used in:",
                "options": [
                    "Carnatic music",
                    "Hindustani folk music",
                    "South Indian classical music",
                    "Western classical music"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Which is the primary focus of \"Dhrupad\" singing?",
                "options": [
                    "Rapid tempo",
                    "Strict adherence to rhythm",
                    "Slow, meditative presentation",
                    "Fast improvisations"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "In Hindustani music, \"Vistar\" refers to:",
                "options": [
                    "A fast rhythmic pattern",
                    "A slow, detailed elaboration of the raga",
                    "A fixed composition",
                    "A percussion section"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "What is \"Chaturang\" in Hindustani classical music?",
                "options": [
                    "A rhythmic pattern",
                    "A type of drone instrument",
                    "A four-part composition",
                    "A vocal ornamentation"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "\"Gharana\" is a term used to describe:",
                "options": [
                    "A type of tala",
                    "A style or tradition of playing or singing",
                    "A form of improvisation",
                    "A class of instruments"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "\"Taranas\" are:",
                "options": [
                    "Compositions with melody and rhythmic syllables",
                    "Rhythmic improvisations",
                    "Ragas with lyrics",
                    "Instruments"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Novel form of jugalbandi in Hindustani music:",
                "options": [
                    "Sarangi",
                    "Jasrangi",
                    "Adarangi",
                    "Sadarangi"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "A star is named after which exponent:",
                "options": [
                    "Jasraj",
                    "Rashid Khan",
                    "Vilayat Khan",
                    "Veena Sahasrabuddhe"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Popular flute exponent in Hindustani music?",
                "options": [
                    "Hariprasad Chaurasiya",
                    "Bhimsen Joshi",
                    "Parveen Sultana",
                    "Sayajit Khan"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Which raga is generally performed to the end in Hindustani concert?",
                "options": [
                    "Raga Bhairav",
                    "Raga Hamsadhwani",
                    "Raga Desh",
                    "Raga Yaman"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Pandit Ajay Chakraborty's musician daughter:",
                "options": [
                    "Kethaki",
                    "Kaushiki",
                    "Menaki",
                    "Tamaki"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "\"Matra\" is the term for:",
                "options": [
                    "A fixed composition",
                    "The smallest unit of time in a tala",
                    "A melodic ornamentation",
                    "The main beat of a tala"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "The \"Alap\" is usually performed:",
                "options": [
                    "With rhythm",
                    "Without rhythm",
                    "As a duet",
                    "In a choir"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Which of these is used to practice rhythm in Hindustani music?",
                "options": [
                    "Taalmala",
                    "Srutibox",
                    "Harmonium",
                    "Tanpura"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Bol taan in Hindustani music refers to:",
                "options": [
                    "Taan without lyrics",
                    "Melody notes used in vocal exercises",
                    "Taan with lyrics",
                    "An instrumental composition"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "Dhamar compositions are sung in:",
                "options": [
                    "Teentaal",
                    "Japtaal",
                    "Dhamar Taal",
                    "Rupak Taal"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "\"Meend\" refers to:",
                "options": [
                    "A rhythmic ornament",
                    "A sliding movement between notes",
                    "A composition type",
                    "A fast rhythmic section"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Laukari in Hindustani music is the term for:",
                "options": [
                    "Melody",
                    "Rhythmic variations",
                    "Composition",
                    "Vocal ornamentation"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Which raga is known as Tansen Raag?",
                "options": [
                    "Raga Yaman",
                    "Raga Hamsadhwani",
                    "Raga Miya ki Malhar",
                    "Raga Marwa"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "\"Madhya Laya\" refers to:",
                "options": [
                    "A slow tempo",
                    "A fast tempo",
                    "A medium tempo",
                    "A rhythmic ornament"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "The rhythm pattern of \"Ektaal\" consists of:",
                "options": [
                    "10 beats",
                    "12 beats",
                    "16 beats",
                    "14 beats"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "\"Khayal\" in Hindustani music is similar to:",
                "options": [
                    "Bhajan",
                    "Kriti",
                    "Tillana",
                    "None"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "The \"Tani Avartanam\" is a section of:",
                "options": [
                    "Vocal performance",
                    "Instrumental performance",
                    "Rhythmic improvisation by percussionists",
                    "Composition writing"
                ],
                "correctAnswer": "C"
            },
            {
                "question": "\"Vilambit\" refers to:",
                "options": [
                    "A fast tempo",
                    "A slow tempo",
                    "A rhythmic pattern",
                    "An ornamentation"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "The \"Dholak\" is primarily used in:",
                "options": [
                    "Hindustani classical music",
                    "Folk music",
                    "Carnatic music",
                    "Western classical music"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Ascending order of swaras is:",
                "options": [
                    "Avaroh",
                    "Aroh",
                    "Meend",
                    "Gamak"
                ],
                "correctAnswer": "B"
            },
            {
                "question": "Main swara group in a Raga is:",
                "options": [
                    "Pakad",
                    "Saptak",
                    "Nyaas",
                    "Graha"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "\"Konnakol\" is the art of:",
                "options": [
                    "Singing rhythmic syllables",
                    "Playing the flute",
                    "Playing tabla",
                    "Vocal improvisation"
                ],
                "correctAnswer": "A"
            },
            {
                "question": "Hindustani semi-classical form:",
                "options": [
                    "Khayal",
                    "Dhrupad",
                    "Thumri",
                    "Dhamar"
                ],
                "correctAnswer": "C"
            }
    ],
    "general music": [

        {
            "question": "Which of these is a basic note in Carnatic music?",
            "options": ["Sa", "Ga", "Ma", "Pa"],
            "correctAnswer": "A"
        },
        {
            "question": "How is rhythm showed in Carnatic music?",
            "options": ["Tala", "Raga", "Shruti", "Sa"],
            "correctAnswer": "A"
        },
        {
            "question": "Which instrument is commonly used in Carnatic music?",
            "options": ["Veena", "Guitar", "Piano", "Drums"],
            "correctAnswer": "A"
        },
        {
            "question": "How many basic swaras (notes) are there in Carnatic music?",
            "options": ["5", "6", "7", "8"],
            "correctAnswer": "C"
        },
        {
            "question": "Which swara is called 'Sa'?",
            "options": ["First note", "Second note", "Third note", "Fifth note"],
            "correctAnswer": "A"
        },
        {
            "question": "Two musical systems of India?",
            "options": ["Hindustani, Carnatic", "Western, Carnatic", "Hindustani, Canadian", "All"],
            "correctAnswer": "A"
        },
        {
            "question": "Which of these is a famous Carnatic composer?",
            "options": ["Mozart", "Tyagaraja", "Beethoven", "Tchaikovsky"],
            "correctAnswer": "B"
        },
        {
            "question": "Who is a popular singer in Hindustani music?",
            "options": ["Hariharan", "Pandit Jasraj", "Tyagaraja", "Syamasastri"],
            "correctAnswer": "B"
        },
        {
            "question": "What is the name of the Carnatic percussion instrument that is widely used?",
            "options": ["Tabla", "Mridangam", "Drums", "Conga"],
            "correctAnswer": "B"
        },
        {
            "question": "What is a 'Krithi' in Carnatic music?",
            "options": ["A type of swaram", "A type of rhythm", "A musical form", "A type of dance"],
            "correctAnswer": "C"
        },
        {
            "question": "What is the role of 'Shruti' in Carnatic music?",
            "options": ["The tala", "The rhythm", "The drone sound that supports the melody", "The lyrics"],
            "correctAnswer": "C"
        },
        {
            "question": "Which of these is an example of a raga?",
            "options": ["Tala", "Shruti", "Hamsadhwani", "Varnam"],
            "correctAnswer": "C"
        },
        {
            "question": "What is the 'Pallavi' in a Carnatic composition?",
            "options": ["Laya", "The last line of the song", "A type of rhythm pattern", "The first repetitive lines of the song"],
            "correctAnswer": "D"
        },
        {
            "question": "Which of these instruments is used for melody in Hindustani music?",
            "options": ["Harmonium", "Tabla", "Mridangam", "Ghatam"],
            "correctAnswer": "A"
        },
        {
            "question": "What is similar for Carnatic music and Hindustani?",
            "options": ["Dance", "Raga", "Mridangam", "Tabla"],
            "correctAnswer": "B"
        },
        {
            "question": "What is rhythmic pattern?",
            "options": ["Tisra", "Raga", "Swara", "Shruti"],
            "correctAnswer": "A"
        },
        {
            "question": "Stringed instrument?",
            "options": ["Veena", "Flute", "Dholak", "Tabla"],
            "correctAnswer": "A"
        },
        {
            "question": "Rhythmic instrument?",
            "options": ["Tabla", "Violin", "Veena", "None"],
            "correctAnswer": "A"
        },
        {
            "question": "What does 'Sa' in Classical music represent?",
            "options": ["A note", "A rhythm", "A raga", "An instrument"],
            "correctAnswer": "A"
        },
        {
            "question": "What is the 5th note in 7 musical notes?",
            "options": ["Ga", "Re", "Pa", "Dha"],
            "correctAnswer": "C"
        },
        {
            "question": "Recent Magasassay awardee?",
            "options": ["Shankar", "T.M. Krishna", "Ramamurty", "Akbar Khan"],
            "correctAnswer": "B"
        },
        {
            "question": "Which of these is a well-known Carnatic musical form?",
            "options": ["Kriti", "Sonata", "Symphonie", "Etude"],
            "correctAnswer": "A"
        },
        {
            "question": "Which rhythmic instrument accompanies Carnatic music?",
            "options": ["Tabla", "Mridangam", "Conga", "Bongos"],
            "correctAnswer": "B"
        },
        {
            "question": "Origin of Carnatic music?",
            "options": ["West India", "East India", "North India", "South India"],
            "correctAnswer": "D"
        },
        {
            "question": "'Raga' refers to:",
            "options": ["A rhythmic pattern", "A melody or tune", "A drum instrument", "A form of dance"],
            "correctAnswer": "B"
        },
        {
            "question": "Musical notes?",
            "options": ["4", "5", "6", "7"],
            "correctAnswer": "D"
        },
        {
            "question": "What is the 'Tala' in Carnatic music?",
            "options": ["The melody", "The rhythm or time cycle", "The drone sound", "The lyrics"],
            "correctAnswer": "B"
        },
        {
            "question": "Which of these are important aspects in Hindustani music?",
            "options": ["Harmony, semi-tone", "Raga, Tala", "Bass tone, high pitch", "Sweet voice"],
            "correctAnswer": "B"
        },
        {
            "question": "'Gamaka' refers to:",
            "options": ["A rhythmic pattern", "An ornamentation or embellishment of a note", "A specific raga", "A composition form"],
            "correctAnswer": "B"
        },
        {
            "question": "Indian music is associated to which era?",
            "options": ["Vedic", "Mughal", "British", "Gupta"],
            "correctAnswer": "A"
        },

        {
            "question": "Which instrument is considered as rhythmic instrument?",
            "options": ["Veena", "Flute", "Kanjira", "Violin"],
            "correctAnswer": "C"
        },
        {
            "question": "What does 'Laya' refer to in music?",
            "options": ["Melody", "Rhythm or tempo", "Composition form", "Lyrics"],
            "correctAnswer": "B"
        },
        {
            "question": "Which of these is NOT a Hindustani music instrument?",
            "options": ["Tabla", "Sitar", "Sarangi", "Piano"],
            "correctAnswer": "D"
        },
        {
            "question": "Which of these is the second musical note?",
            "options": ["Re", "Ga", "Ma", "Pa"],
            "correctAnswer": "A"
        },
        {
            "question": "Which swara is also called 'Ga' in Carnatic music?",
            "options": ["Gangaadharam", "Gandharam", "Ganagandharva", "Gnaana Gaandhari"],
            "correctAnswer": "B"
        },
        {
            "question": "What is 'Shruti' in Carnatic music?",
            "options": ["A note", "A rhythm", "The smallest pitch interval", "A tala"],
            "correctAnswer": "C"
        },
        {
            "question": "Which of these is a string instrument?",
            "options": ["Tabla", "Bansuri", "Sitar", "Damaru"],
            "correctAnswer": "C"
        },
        {
            "question": "Which is the final section in a song?",
            "options": ["Pallavi", "Charanam", "Anupallavi", "Tani"],
            "correctAnswer": "B"
        },
        {
            "question": "What is 'Ma' in Indian music?",
            "options": ["Madhavam", "Madhuram", "Madhayamam", "Mahima"],
            "correctAnswer": "C"
        },
        {
            "question": "'Sargam' in music refers to:",
            "options": ["A rhythmic pattern", "A vocal exercise on the notes of the scale", "A dance", "A specific raga"],
            "correctAnswer": "B"
        },
        {
            "question": "The 'Alapana' is typically used for:",
            "options": ["Tala", "Raga", "Rhythm", "None"],
            "correctAnswer": "B"
        },
        {
            "question": "Flute is made with?",
            "options": ["Plastic", "Steel", "Bamboo", "None"],
            "correctAnswer": "C"
        },
        {
            "question": "What is the 'Ghatam' made of?",
            "options": ["Plastic", "Soil", "Wood", "Gold"],
            "correctAnswer": "B"
        },
        {
            "question": "Which of these is an important composition type in Carnatic music?",
            "options": ["Sonatas", "Symphonies", "Thillana", "Operas"],
            "correctAnswer": "C"
        },
        {
            "question": "The Mangalam in a Concert is:",
            "options": ["Last item", "The introduction", "The rhythmic accompaniment", "The first song"],
            "correctAnswer": "A"
        },
        {
            "question": "The 'Anupallavi' is sung to:",
            "options": ["Swaram patterns", "Caranam", "Pallavi", "The ending"],
            "correctAnswer": "C"
        },
        {
            "question": "Vocal duet involves how many musicians?",
            "options": ["1", "2", "3", "4"],
            "correctAnswer": "B"
        },
        {
            "question": "Bhajan is:",
            "options": ["Devotional", "Filmy", "Sad", "None"],
            "correctAnswer": "A"
        },
        {
            "question": "What does 'Sahitya' mean in Carnatic music?",
            "options": ["The rhythm", "The melody", "The lyrics", "The drone sound"],
            "correctAnswer": "C"
        },
        {
            "question": "The Carnatic instrument that provides Sruthi is:",
            "options": ["Veena", "Flute", "Mridangam", "Tambura"],
            "correctAnswer": "D"
        },
        {
            "question": "Which of these is a popular Talam in Carnatic music?",
            "options": ["Adi Tala", "Raga", "Swara", "Shruti"],
            "correctAnswer": "A"
        },
        {
            "question": "Which of these is often used for melody in Carnatic music?",
            "options": ["Flute", "Mridangam", "Tabla", "Kanjira"],
            "correctAnswer": "A"
        },
        {
            "question": "Tarana is in:",
            "options": ["Carnatic music", "Western music", "Hindustani music", "All"],
            "correctAnswer": "C"
        },
        {
            "question": "Sapta Swaras are:",
            "options": ["Eight", "Seven", "Five", "Four"],
            "correctAnswer": "B"
        },
        {
            "question": "What does 'Laya' in music refer to?",
            "options": ["A type of raga", "Tempo or rhythm", "Lyrics", "Melody"],
            "correctAnswer": "B"
        },
        {
            "question": "'Shruti' refers to:",
            "options": ["A rhythmic cycle", "The smallest pitch interval", "A melodic instrument", "A fixed composition"],
            "correctAnswer": "B"
        },
        {
            "question": "The 'Raga' in Carnatic music can be compared to:",
            "options": ["Melody", "Rhythm", "Harmony", "Lyrics"],
            "correctAnswer": "A"
        },
        {
            "question": "Which of these is a popular singer in Carnatic music?",
            "options": ["MS Gajalaxmi", "Varalaxmi", "MS Subbalaxmi", "Mahalaxmi"],
            "correctAnswer": "C"
        },
        {
            "question": "Famous singer in Carnatic music is:",
            "options": ["M Balamurali Krishna", "M Krishnaparasad", "Rajeswararao", "Blasubrahmaniam"],
            "correctAnswer": "A"
        },
        {
            "question": "Gaatram refers to:",
            "options": ["Dance", "Flute", "Voice", "Violin"],
            "correctAnswer": "C"
        },
        {
            "question": "'Swaras' in Carnatic music are:",
            "options": ["Melody notes", "Rhythmic cycles", "Composition forms", "Fixed compositions"],
            "correctAnswer": "A"
        },
        {
            "question": "Which of these is used to keep the rhythm in Carnatic music?",
            "options": ["Tabla", "Mridangam", "Pakhavaz", "Tambura"],
            "correctAnswer": "B"
        },
        {
            "question": "'Chathur' in Carnatic music refers to the number:",
            "options": ["3", "5", "4", "7"],
            "correctAnswer": "C"
        },
        {
            "question": "What is a famous Carnatic music concert instrument?",
            "options": ["Saxophone", "Piano", "Guitar", "Violin"],
            "correctAnswer": "D"
        },
        {
            "question": "Carnatic trinity composer:",
            "options": ["Tyagaraja", "Rehman", "Sirivennela", "Hariprasad"],
            "correctAnswer": "A"
        },
        {
            "question": "First note in Sapta Swaras?",
            "options": ["Rishabham", "Shadjam", "Sadharanam", "Sadhanam"],
            "correctAnswer": "B"
        },
        {
            "question": "Which of these is a characteristic of a Talam?",
            "options": ["Irregular pattern", "Raga pattern", "Swara pattern", "Cyclic pattern"],
            "correctAnswer": "D"
        },
        {
            "question": "What does 'Swaram' mean in Carnatic music?",
            "options": ["Rhythm", "Beat", "Note", "Laya"],
            "correctAnswer": "C"
        },
        {
            "question": "The 'Tala' in Carnatic music refers to:",
            "options": ["Melody", "Rhythm", "Composition", "Lyrics"],
            "correctAnswer": "B"
        },
        {
            "question": "What is the primary instrument used for rhythm in Carnatic music?",
            "options": ["Violin", "Mridangam", "Tabla", "Flute"],
            "correctAnswer": "B"
        },
        {
            "question": "The 'Alapana' is usually sung:",
            "options": ["With lyrics", "Without lyrics", "As a duet", "In a choir"],
            "correctAnswer": "B"
        },
        {
            "question": "Sapta Alankarams in Carnatic music are:",
            "options": ["6", "70", "7", "17"],
            "correctAnswer": "C"
        },
        {
            "question": "The other Indian musical system like Carnatic music is:",
            "options": ["Kajikistani", "Haindavi", "Hindustani", "Western"],
            "correctAnswer": "C"
        },
        {
            "question": "'Madhyamavati' is a type of:",
            "options": ["Tala", "Raga", "Kriti", "Swara"],
            "correctAnswer": "B"
        },
        {
            "question": "Talam in Carnatic music is shown with:",
            "options": ["Raga", "Hands", "Legs", "Voice"],
            "correctAnswer": "B"
        }
        
        ]
    };

    if (selectedMusic === "Carnatic music") {
        selectedQuestions = questionsByCategory["Carnatic music"];
    } else if (selectedMusic === "Hindustani classical music") {
        selectedQuestions = questionsByCategory["Hindustani classical music"];
    } else if (selectedMusic === "general music") {
        selectedQuestions = questionsByCategory["general music"];
    }

    // Example: Use selectedQuestions for the quiz
    selectedQuestions.forEach(question => {
        console.log(question.question);
        question.options.forEach((option, index) => {
            console.log(`${String.fromCharCode(65 + index)}: ${option}`);
        });
    });
        

        // Randomly select 'questionsCount' number of questions
        const randomQuestions = getRandomQuestions(selectedQuestions, questionsCount);

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