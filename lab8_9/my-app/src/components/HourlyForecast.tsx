import React from 'react';
import type { ForecastItem } from '../types/weather';

interface HourlyForecastProps {
  forecasts: ForecastItem[];
}

const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecasts }) => {
  const nextHours = forecasts.slice(0, 6);

  const formatTime = (dt: number) => {
    const date = new Date(dt * 1000);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="hourly-forecast">
      <div className="hourly-title">Почасовой прогноз</div>
      <div className="hourly-grid">
        {nextHours.map((item, index) => (
          <div key={index} className="hourly-cell">
            <div className="hourly-time">{formatTime(item.dt)}</div>
            <div className="hourly-temp">{Math.round(item.main.temp)}°</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyForecast;