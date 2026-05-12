import React from 'react';
import type { AirPollution } from '../types/weather';

interface AirPollutionProps {
  pollution: AirPollution;
}

const AirPollution: React.FC<AirPollutionProps> = ({ pollution }) => {
  const aqi = pollution.list[0].main.aqi;
  const components = pollution.list[0].components;

  const getAQIText = (aqi: number) => {
    switch(aqi) {
      case 1: return { text: 'Отличное', color: '#4caf50' };
      case 2: return { text: 'Хорошее', color: '#8bc34a' };
      case 3: return { text: 'Удовлетворительное', color: '#ffc107' };
      case 4: return { text: 'Плохое', color: '#ff9800' };
      case 5: return { text: 'Опасное', color: '#f44336' };
      default: return { text: 'Неизвестно', color: '#999' };
    }
  };

  const aqiInfo = getAQIText(aqi);

  return (
    <div className="air-pollution">
      <h3>Качество воздуха</h3>
      <div className="aqi" style={{ color: aqiInfo.color }}>
        {aqiInfo.text}
      </div>
      <div className="pollutants">
        <div>PM2.5: {components.pm2_5} µg/m³</div>
        <div>PM10: {components.pm10} µg/m³</div>
        <div>NO₂: {components.no2} µg/m³</div>
        <div>O₃: {components.o3} µg/m³</div>
      </div>
    </div>
  );
};

export default AirPollution;