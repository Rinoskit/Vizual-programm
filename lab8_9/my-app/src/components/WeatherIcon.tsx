import React from 'react';

interface WeatherIconProps {
  iconCode: string;
  description: string;
  size?: number;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ iconCode, description, size = 50 }) => {
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  
  return (
    <img 
      src={iconUrl} 
      alt={description}
      style={{ width: size, height: size }}
    />
  );
};

export default WeatherIcon;