import axios from 'axios';
import type { ForecastItem, AirPollution, City } from '../types/weather';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

export const weatherService = {
  async getForecast(lat: number, lon: number) {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        units: 'metric',
        lang: 'ru'
      }
    });
    return response.data;
  },


  async getCurrentWeather(lat: number, lon: number) {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        units: 'metric',
        lang: 'ru'
      }
    });
    return response.data;
  },


  async getAirPollution(lat: number, lon: number): Promise<AirPollution> {
    const response = await axios.get(`${BASE_URL}/air_pollution`, {
      params: {
        lat,
        lon,
        appid: API_KEY
      }
    });
    return response.data;
  },

  async searchCity(query: string): Promise<City[]> {
    const response = await axios.get(`${GEO_URL}/direct`, {
      params: {
        q: query,
        limit: 5,
        appid: API_KEY,
        lang: 'ru'
      }
    });
    return response.data;
  }
};