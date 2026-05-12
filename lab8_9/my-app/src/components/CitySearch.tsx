import React, { useState } from 'react';
import { weatherService } from '../services/weatherService';
import type { City } from '../types/weather';

interface CitySearchProps {
  onCitySelect: (city: City) => void;
}

const CitySearch: React.FC<CitySearchProps> = ({ onCitySelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  const searchCity = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const cities = await weatherService.searchCity(searchQuery);
      setSuggestions(cities);
    } catch (error) {
      console.error('Ошибка поиска города:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (city: City) => {
    onCitySelect(city);
    setQuery(`${city.name}, ${city.country}`);
    setSuggestions([]);
  };

  return (
    <div className="city-search">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          searchCity(e.target.value);
        }}
        placeholder="Введите название города..."
        className="search-input"
      />
      {loading && <div className="search-loading">Поиск...</div>}
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((city, index) => (
            <li key={index} onClick={() => handleSelect(city)}>
              {city.name}, {city.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CitySearch;