import { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';
import { mockForecast, mockAirPollution } from '../services/mockData';
import type { ForecastItem, AirPollution, WeatherData } from '../types/weather';

const USE_MOCK = true;

export const useWeather = (lat: number, lon: number) => {
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [airPollution, setAirPollution] = useState<AirPollution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        if (USE_MOCK) {
          const mockTemp = Math.random() * 20 + 10;
          setForecast(mockForecast.list.map(item => ({
            ...item,
            main: { ...item.main, temp: mockTemp + (Math.random() * 5 - 2) }
          })));
          setCurrentWeather({
            temp: mockTemp,
            feels_like: mockTemp - 1,
            humidity: 65,
            pressure: 1013,
            wind_speed: 3.5,
            uvi: 4,
            description: 'ясно',
            icon: '01d'
          });
          setAirPollution(mockAirPollution);
        } else {
          const [forecastData, currentData, pollutionData] = await Promise.all([
            weatherService.getForecast(lat, lon),
            weatherService.getCurrentWeather(lat, lon),
            weatherService.getAirPollution(lat, lon)
          ]);

          setForecast(forecastData.list);
          setCurrentWeather({
            temp: currentData.main.temp,
            feels_like: currentData.main.feels_like,
            humidity: currentData.main.humidity,
            pressure: currentData.main.pressure,
            wind_speed: currentData.wind.speed,
            description: currentData.weather[0].description,
            icon: currentData.weather[0].icon
          });
          setAirPollution(pollutionData);
        }
      } catch (err) {
        setError('Ошибка загрузки данных о погоде');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lon) {
      fetchWeather();
      
      const interval = setInterval(fetchWeather, 3 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [lat, lon]);

  return { forecast, currentWeather, airPollution, loading, error };
};