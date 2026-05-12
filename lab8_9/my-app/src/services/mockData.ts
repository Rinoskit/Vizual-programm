import type { ForecastItem, AirPollution } from '../types/weather';

export const mockForecast = {
  list: Array.from({ length: 40 }, (_, i) => ({
    dt: Date.now() / 1000 + i * 3 * 3600,
    main: {
      temp: 20 + Math.sin(i) * 5,
      feels_like: 19,
      humidity: 65 + Math.random() * 20,
      pressure: 1013
    },
    weather: [{
      id: 800,
      main: 'Clear',
      description: 'ясно',
      icon: '01d'
    }],
    wind: { speed: 3 + Math.random() * 5 },
    dt_txt: new Date(Date.now() + i * 3 * 3600000).toISOString()
  }))
};

export const mockAirPollution: AirPollution = {
  list: [{
    main: { aqi: 2 },
    components: {
      co: 200, no: 10, no2: 20, o3: 30,
      so2: 5, pm2_5: 12, pm10: 25, nh3: 3
    }
  }]
};