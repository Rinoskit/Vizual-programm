import React from 'react';
import type { ForecastItem } from '../types/weather';

interface DailyForecastProps {
  forecasts: ForecastItem[];
}

const DailyForecast: React.FC<DailyForecastProps> = ({ forecasts }) => {
  const dailyMap = new Map();

  forecasts.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        day: dayKey,
        min: item.main.temp,
        max: item.main.temp
      });
    } else {
      const existing = dailyMap.get(dayKey);
      existing.min = Math.min(existing.min, item.main.temp);
      existing.max = Math.max(existing.max, item.main.temp);
    }
  });

  const dailyList = Array.from(dailyMap.values()).slice(0, 6);

  return (
    <div className="daily-forecast">
      {dailyList.map((day, index) => (
        <div key={index} className="daily-row">
          <span className="daily-day">{day.day}</span>
          <span className="daily-temp-range">{Math.round(day.max)}°/{Math.round(day.min)}°</span>
        </div>
      ))}
    </div>
  );
};

export default DailyForecast;