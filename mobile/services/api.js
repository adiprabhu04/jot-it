import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://jotit-api.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

export const getNotes = () => api.get('/notes');

export const createNote = (title, content, category) =>
  api.post('/notes', { title, content, category });

export const updateNote = (id, title, content, category) =>
  api.put(`/notes/${id}`, { title, content, category });

export const deleteNote = (id) => api.delete(`/notes/${id}`);

export const scanImage = async (imageUri) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  });

  return api.post('/notes/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
