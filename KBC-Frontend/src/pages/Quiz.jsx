import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [used50_50, setUsed50_50] = useState(false);
  const [usedAudiencePoll, setUsedAudiencePoll] = useState(false);
  const [usedPhoneAFriend, setUsedPhoneAFriend] = useState(false);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [areLifelinesDisabled, setAreLifelinesDisabled] = useState(false);
  const [hasQuestionBeenRead, setHasQuestionBeenRead] = useState(false);
  const [isLifelineUsed, setIsLifelineUsed] = useState(false);
  const [timer, setTimer] = useState(30); // Timer state for each question
  const [isTimerRunning, setIsTimerRunning] = useState(true); // Flag to control timer



    const fetchQuestions = async () => {
      try {
        const openAIEnabled = false;
        const url = openAIEnabled
          ? 'http://localhost:5000/api/v1/questions/generate'
          : 'http://localhost:5000/api/v1/questions/regenerate';
        const selectedMusic = localStorage.getItem('selectedMusic');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: selectedMusic,
            difficulty: 'basic',
            questionsCount: 10,
          }),
        });
        const data = await response.json();
        const questionsArray = data.questions;
        setQuestionsWithAnswers(questionsArray);
        const forUser = questionsArray.map(({ correctAnswer, ...rest }) => rest);
        setQuestions(forUser);
      } catch (err) {
        console.error('Error fetching questions:', err);
      }
    };



  useEffect(() => {
    fetchQuestions(); // Fetch questions when the component is mounted
  }, []); // Empty dependency array means it runs only once

  const readQuestionAndOptionsOutLoud = () => {
    const currentQuestion = questions[currentIndex];
    const questionText = currentQuestion.question;
    const options = currentQuestion.options.join(', '); // Join options with commas for easier reading
    console.log('Reading question:', questionText); // Log to see if this function is called

    const utterance = new SpeechSynthesisUtterance(`${questionText} Options are: ${options}`);
    window.speechSynthesis.speak(utterance);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


  useEffect(() => {
    if (questions.length > 0 && !hasQuestionBeenRead && !isLifelineUsed) {
      readQuestionAndOptionsOutLoud()
      setHasQuestionBeenRead(true); // Set flag to true after the question is read
    }

    const handleBeforeUnload = () => {
      window.speechSynthesis.cancel();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, questions, isLifelineUsed]);

  const handleLifelineUsed = () => {
    setIsLifelineUsed(true); // Mark lifeline as used
    setHasQuestionBeenRead(false); // Reset the flag when a lifeline is used
  };

  const isCorrect = (option) => {
    const correctAnswer = questionsWithAnswers[currentIndex].correctAnswer.trim().toUpperCase();
    const selectedLetter = option.split(')')[0].trim().toUpperCase();
    const correctLetter = correctAnswer.replace(/^.*:\s*/, '').trim();
    return selectedLetter === correctLetter;
  };


  useEffect(() => {
    // Timer logic
    if (isTimerRunning) {
      const timerInterval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer > 0) {
            return prevTimer - 1;
          } else {
            clearInterval(timerInterval);
            handleTimeUp(); // Automatically submit when time is up
            return 0;
          }
        });
      }, 1000);

      return () => clearInterval(timerInterval); // Clear interval on component unmount or when timer resets
    }
  }, [isTimerRunning]);

  const handleTimeUp = () => {
    setIsTimerRunning(false); // Stop the timer
    setAnswerSubmitted(true); // Mark the question as submitted
    setFeedback([
      ...feedback,
      { questionIndex: currentIndex, isCorrect: false, selectedLetter: null }, // Record as incorrect if time is up
    ]);
    // setTimeout(() => {
    //   handleNextQuestion(); // Move to the next question after showing feedback
    // }, 2000); // Delay to show "time's up" message
  };

  const handleSubmit = () => {
    setIsTimerRunning(false); // Stop the timer
    window.speechSynthesis.cancel();

    const correctAnswer = questionsWithAnswers[currentIndex].correctAnswer.trim().toUpperCase();
    const selectedLetter = selectedOption.split(')')[0].trim().toUpperCase();
    const correctLetter = correctAnswer.replace(/^.*:\s*/, '').trim();

    const isOptionCorrect = correctLetter === selectedLetter;

    if (isOptionCorrect) {
      setScore(score + 1);
    }

    setFeedback([
      ...feedback,
      { questionIndex: currentIndex, isCorrect: isOptionCorrect, selectedLetter },
    ]);

    setAnswerSubmitted(true);
    setIsSubmitDisabled(true);
    setAreLifelinesDisabled(true);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setAnswerSubmitted(false);
    setCurrentIndex(currentIndex + 1);
    setIsSubmitDisabled(false);
    setAreLifelinesDisabled(false);
    setHasQuestionBeenRead(false); // Reset hasQuestionBeenRead for the next question
    setIsLifelineUsed(false); // Reset lifeline usage for the next question
    setTimer(30); // Reset timer to 30 seconds
    setIsTimerRunning(true); // Restart the timer
  };

  const handleComplete = () => {
    navigate('/results', {
      state: {
        score,
        feedback,
        totalQuestions: questions.length,
      },
    });
  };

  // 50-50 Lifeline
  const handle50_50 = () => {
    const currentQuestion = questionsWithAnswers[currentIndex];
    const correctOptionLetter = currentQuestion.correctAnswer.split(":")[1].trim();
    const correctOption = currentQuestion.options.find(option => option.startsWith(`${correctOptionLetter})`));
    const incorrectOptions = currentQuestion.options.filter(option => option !== correctOption);
    const randomIncorrectOption = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];

    setUsed50_50(true);
    handleLifelineUsed();

    setQuestions(prevQuestions => {
      const updatedQuestions = [...prevQuestions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        options: [correctOption, randomIncorrectOption],
      };
      return updatedQuestions;
    });
  };

  const handleAudiencePoll = () => {
    setUsedAudiencePoll(true);
    handleLifelineUsed();

    const currentQuestion = questionsWithAnswers[currentIndex];
    const correctAnswerIdentifier = currentQuestion.correctAnswer.split(":")[1].trim();
    const optionsIdentifiers = ["A", "B", "C", "D"];
    const pollResults = optionsIdentifiers.map((identifier, index) => {
      if (identifier === correctAnswerIdentifier) {
        return Math.floor(Math.random() * 50) + 50;
      } else {
        return Math.floor(Math.random() * 50);
      }
    });

    const totalPercentage = pollResults.reduce((acc, percentage) => acc + percentage, 0);
    const scale = 100 / totalPercentage;
    const scaledPollResults = pollResults.map(percentage => Math.floor(percentage * scale));

    alert(`Audience Poll Results:
      A: ${scaledPollResults[0]}% 
      B: ${scaledPollResults[1]}% 
      C: ${scaledPollResults[2]}% 
      D: ${scaledPollResults[3]}% `);
  };

  const handlePhoneAFriend = () => {
    setUsedPhoneAFriend(true);
    handleLifelineUsed();

    const currentQuestion = questionsWithAnswers[currentIndex];
    const isCorrect = Math.random() > 0.5;
    const optionsWithoutCorrect = currentQuestion.options.filter(option => option !== currentQuestion.correctAnswer);

    alert(`Phone a Friend: The friend might suggest: ${optionsWithoutCorrect[Math.floor(Math.random() * optionsWithoutCorrect.length)]}`);
  };

  if (questions.length === 0) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">
          Loading Questions
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="quiz-container">
      <div className="quiz-content">
        <div className="question-area">
          { timer > 0 && (
            <div className={`timer text ${timer < 10 ? 'blink' : ''}`}>
                <span>Time Left: {timer} seconds</span>
              </div> )
          }
          <h3 className="question-text">{currentQuestion.question}</h3>

          <div className="options">
            {currentQuestion.options.map((option, index) => (
              <label 
                key={index} 
                className={`option-label 
                  ${selectedOption === option && isCorrect(option) ? 'correct' : ''} 
                  ${selectedOption === option && !isCorrect(option) ? 'incorrect' : ''} 
                  `}
              >
                <input
                  type="radio"
                  name="option"
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => setSelectedOption(option)}
                  disabled={answerSubmitted}
                />
                {option}
              </label>
            ))}
          </div>

          <button
            className={`submit-button ${selectedOption === null ? 'disabled' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitDisabled || selectedOption === null}
          >
            Submit
          </button>

          {answerSubmitted && feedback[currentIndex] && (
            <div className="inline-feedback">
              {feedback[currentIndex].isCorrect ? (
                <span style={{ color: 'green' }}>Correct!</span>
              ) : (
                <span style={{ color: 'red' }}>
                  Incorrect! The correct answer is: {questionsWithAnswers[currentIndex].correctAnswer.replace("Correct answer: ", "")}
                </span>
              )}
            </div>
          )}

         {/* Show lifeline grid only if the question has been read */}
         {hasQuestionBeenRead && !answerSubmitted && (
            <div className="lifeline-container">
              {!used50_50 && !areLifelinesDisabled && (
                <button className="lifeline-button" onClick={handle50_50}>
                  <img src="/assets/images/50-50.jpg" alt="50-50" />
                </button>
              )}
              {!usedAudiencePoll && !areLifelinesDisabled && (
                <button className="lifeline-button" onClick={handleAudiencePoll}>
                  <img src="/assets/images/audiance_poll.jpg" alt="Audience Poll" />
                </button>
              )}
              {!usedPhoneAFriend && !areLifelinesDisabled && (
                <button className="lifeline-button" onClick={handlePhoneAFriend}>
                  <img src="/assets/images/phone_a_friend.webp" alt="Phone a Friend" />
                </button>
              )}
            </div>
          )}
          
          {answerSubmitted && !isLastQuestion && (
            <button className="next-button" onClick={handleNextQuestion}>
              Next Question
            </button>
          )}
          {answerSubmitted && isLastQuestion && (
            <button className="complete-button" onClick={handleComplete}>
              Complete Quiz
            </button>
          )}
          {/* {answerSubmitted && timer === 0 && (
            <div className="time-up-message">
              <span>Time's up! Moving to the next question...</span>
            </div>
          )} */}
        </div>

        <div className="questions-ladder">
          <ol>
            {questions.map((_, index) => (
              <li key={index} className={`ladder-item ${index === currentIndex ? 'current-question' : ''}`}>
                Question {index + 1}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Quiz;