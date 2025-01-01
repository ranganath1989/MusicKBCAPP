import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Quiz.css";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { score = 0, totalQuestions = 1 } = location.state || {};
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [scorePercentage, setScorePercentage] = useState(0);
  const [fireworks, setFireworks] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    // Calculate and set the score percentage
    const percentage = Math.round((score / totalQuestions) * 100);
    setScorePercentage(percentage);
  }, [score, totalQuestions]);

  useEffect(() => {
    // Generate fireworks periodically
    const generateFireworks = () => {
      const newFireworks = Array.from({ length: 30 }, () => ({
        id: Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setFireworks(newFireworks);
    };

    generateFireworks();
    const interval = setInterval(generateFireworks, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Play music on page load
    const handlePlayMusic = () => {
      const selectedMusic = localStorage.getItem("selectedMusic");
      let audioSrc;

      if (selectedMusic === "Carnatic music") {
        audioSrc = "/assets/music/Carnatic.mp3";
      } else if (selectedMusic === "Hindustani classical music") {
        audioSrc = "/assets/music/Hindustani.mp3";
      } else {
        audioSrc = "/assets/music/generalMusic.mp3";
      }

      if (!audioRef.current) {
        audioRef.current = new Audio(audioSrc);
      }
      audioRef.current.play();
      setIsMusicPlaying(true);
    };

    handlePlayMusic();

    // Cleanup function to stop music when the component is unmounted
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsMusicPlaying(false);
    };
  }, []);

  const handleStopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsMusicPlaying(false);
  };

  const handleRestart = () => {
    handleStopMusic();
    navigate("/");
  };

  return (
    <div className="results bg-gradient-to-r from-indigo-600 to-purple-700 min-h-screen text-white flex flex-col items-center justify-center py-16 px-6 relative overflow-hidden">
      <h1 className="text-6xl font-extrabold mb-8 text-center animate__animated animate__fadeIn">
        🎉 Congratulations! 🎉
      </h1>
      <p className="text-3xl mb-10 text-center">
        You earned <span className="text-yellow-400 font-bold">{score}</span> chocolates out of {totalQuestions}!
      </p>

      {/* Circle Progress */}
      <div className="flex flex-col items-center justify-center mb-12 relative w-32 h-32">
        <div className="absolute inset-0 flex justify-center items-center text-center">
          <div className="text-3xl font-bold">{scorePercentage}%</div>
        </div>
        <svg width="100%" height="100%" viewBox="0 0 36 36" className="circle-chart">
          <circle
            className="circle-background"
            cx="18"
            cy="18"
            r="16"
            stroke="#eee"
            strokeWidth="2"
            fill="none"
          />
          <circle
            className="circle-progress"
            cx="18"
            cy="18"
            r="16"
            stroke="#4CAF50"
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${(scorePercentage / 100) * (2 * Math.PI * 16)} ${2 * Math.PI * 16}`}
            strokeLinecap="round"
            transform="rotate(0 18 18)"
            style={{
              transition: "stroke-dasharray 0.5s ease-out",
            }}
          />
        </svg>
      </div>

      {/* Fireworks Animation */}
      <div className="results-fireworks-container absolute top-0 left-0 w-full h-full pointer-events-none">
        {fireworks.map((firework) => (
          <div
            key={firework.id}
            className="firework"
            style={{
              left: `${firework.x}%`,
              top: `${firework.y}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex justify-center space-x-8 mb-12">
        <button
          onClick={handleRestart}
          className="bg-yellow-500 text-black py-4 px-10 rounded-lg font-semibold shadow-lg hover:bg-yellow-400 transition duration-300 transform hover:scale-105"
        >
          Restart Quiz
        </button>
        {/* <button
          onClick={isMusicPlaying ? handleStopMusic : handlePlayMusic}
          className="bg-green-500 text-white py-4 px-10 rounded-lg font-semibold shadow-lg hover:bg-green-400 transition duration-300 transform hover:scale-105"
        >
          {isMusicPlaying ? "Stop Music" : "Play Music"}
        </button> */}
      </div>
    </div>
  );
};

export default Results;