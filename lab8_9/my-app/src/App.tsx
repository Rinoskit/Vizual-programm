import React, { useState } from 'react';
import CitySearch from './components/CitySearch';
import CurrentWeather from './components/CurrentWeather';
import HourlyForecast from './components/HourlyForecast';
import DailyForecast from './components/DailyForecast';
import { useWeather } from './hooks/useWeather';
import type { City } from './types/weather';
import './App.css';

function App() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const { forecast, currentWeather, loading, error } = useWeather(
    selectedCity?.lat || 55.7558,
    selectedCity?.lon || 37.6176
  );

  return (
    <div className="app">
      <div className="weather-card">
        <CitySearch onCitySelect={setSelectedCity} />
        
        {loading && <div className="loading">Загрузка...</div>}
        {error && <div className="loading">{error}</div>}
        
        {!loading && !error && currentWeather && (
          <>
            <CurrentWeather 
              weather={currentWeather} 
              cityName={selectedCity?.name || 'Москва'} 
            />
            <HourlyForecast forecasts={forecast} />
            <DailyForecast forecasts={forecast} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;