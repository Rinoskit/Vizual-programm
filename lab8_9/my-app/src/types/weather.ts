export interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  uvi?: number;
  description: string;
  icon: string;
}

export interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  dt_txt: string;
}

export interface AirPollution {
  list: Array<{
    main: {
      aqi: number;
    };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
  }>;
}

export interface City {
  name: string;
  lat: number;
  lon: number;
  country: string;
}