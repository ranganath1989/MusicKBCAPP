import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Backend API base URL
});

export default api;