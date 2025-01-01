import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [selectedMusic, setSelectedMusic] = useState('Carnatic music');
  const navigate = useNavigate();

  const handleMusicSelection = (event) => {
    setSelectedMusic(event.target.value);
  };

  const startQuiz = () => {
    localStorage.setItem('selectedMusic', selectedMusic); // Store selection for other components
    navigate('/quiz');
  };

  return (
    <div className="home">
      <img src="/assets/images/musicnote.png" alt="Music" style={{ width: '150px', marginBottom: '20px' }} />
      <h1 className="text-4xl font-bold">Welcome to ChocoRaga Quest Quiz!</h1>
      <label className="block mt-4">
        Choose Your Favourite Music &nbsp;
        <select
          value={selectedMusic}
          onChange={handleMusicSelection}
          className="border rounded px-2 py-1 mt-2"
        >
          <option value="Carnatic music">Carnatic Music</option>
          <option value="Hindustani classical music">Hindustani Music</option>
          <option value="general music">Western Music</option>
        </select>
      </label>
      <button
        onClick={startQuiz}
        className="bg-blue-500 text-white py-2 px-4 rounded mt-4"
      >
        Start Quiz
      </button>
    </div>
  );
};

export default Home;