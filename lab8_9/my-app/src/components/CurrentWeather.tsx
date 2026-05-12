import React from 'react';
import type { WeatherData } from '../types/weather';

interface CurrentWeatherProps {
  weather: WeatherData;
  cityName: string;
}

const CurrentWeather: React.FC<CurrentWeatherProps> = ({ weather, cityName }) => {
  return (
    <div className="current-weather">
      <div className="city-name">{cityName}</div>
      <div className="main-temp">{Math.round(weather.temp)}°</div>
      <div className="weather-desc">{weather.description}</div>
      <div className="feels-like">Ощущается как: {Math.round(weather.feels_like)}°C</div>
      
      <div className="details-grid">
        <div className="detail-cell">
          <div className="detail-label">Влажность:</div>
          <div className="detail-value">{weather.humidity}%</div>
        </div>
        <div className="detail-cell">
          <div className="detail-label">Ветер:</div>
          <div className="detail-value">{weather.wind_speed} м/с</div>
        </div>
        <div className="detail-cell">
          <div className="detail-label">Давление:</div>
          <div className="detail-value">{weather.pressure} гПа</div>
        </div>
        {weather.uvi && (
          <div className="detail-cell">
            <div className="detail-label">UV индекс:</div>
            <div className="detail-value">{weather.uvi}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentWeather;