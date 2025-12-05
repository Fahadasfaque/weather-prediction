# Install required libraries
!pip install requests folium pandas matplotlib

import requests
import folium
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Configuration
OPENWEATHER_API_KEY = "faecc2d411cae31997bf7ba82cb62725"  # Your API key

# Indian cities with coordinates
INDIAN_CITIES = {
    "Delhi": {"lat": 28.6139, "lon": 77.2090},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Lucknow": {"lat": 26.8467, "lon": 80.9462},
    "Bhopal": {"lat": 23.2599, "lon": 77.4126},
    "Jaipur": {"lat": 26.9124, "lon": 75.7873},
    "Patna": {"lat": 25.5941, "lon": 85.1376},
    "Ranchi": {"lat": 23.3441, "lon": 85.3096},
    "Bhubaneswar": {"lat": 20.2961, "lon": 85.8245},
    "Guwahati": {"lat": 26.1445, "lon": 91.7362},
    "Imphal": {"lat": 24.8170, "lon": 93.9368},
    "Agartala": {"lat": 23.8315, "lon": 91.2868},
    "Gangtok": {"lat": 27.3389, "lon": 88.6065},
    "Aizawl": {"lat": 23.7271, "lon": 92.7176},
    "Itanagar": {"lat": 27.0844, "lon": 93.6053},
    "Kohima": {"lat": 25.6747, "lon": 94.1100},
    "Shillong": {"lat": 25.5788, "lon": 91.8933},
    "Panaji": {"lat": 15.4909, "lon": 73.8278},
    "Puducherry": {"lat": 11.9139, "lon": 79.8145},
    "Port Blair": {"lat": 11.6234, "lon": 92.7265},
    "Chandigarh": {"lat": 30.7333, "lon": 76.7794},
    "Leh": {"lat": 34.1526, "lon": 77.5771},
    "Srinagar": {"lat": 34.0837, "lon": 74.7973},
    "Dehradun": {"lat": 30.3165, "lon": 78.0322},
    "Shimla": {"lat": 31.1048, "lon": 77.1734},
    "Raipur": {"lat": 21.2514, "lon": 81.6296},
    "Thiruvananthapuram": {"lat": 8.5241, "lon": 76.9366},
    "Dispur": {"lat": 26.1433, "lon": 91.7898}
    # You can keep adding more…
}


def get_weather_forecast(city_name, forecast_days=1):
    """Get detailed weather forecast for an Indian city"""
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={INDIAN_CITIES[city_name]['lat']}&lon={INDIAN_CITIES[city_name]['lon']}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=10).json()

        forecast_data = []
        for item in response['list'][:forecast_days*8]:  # 3-hour intervals
            forecast_data.append({
                "datetime": datetime.fromtimestamp(item['dt']),
                "temp": item['main']['temp'],
                "temp_min": item['main']['temp_min'],
                "temp_max": item['main']['temp_max'],
                "humidity": item['main']['humidity'],
                "pressure": item['main']['pressure'],
                "wind_speed": item['wind']['speed'],
                "rain": item.get('rain', {}).get('3h', 0),
                "description": item['weather'][0]['description']
            })

        return pd.DataFrame(forecast_data)

    except Exception as e:
        print(f"⚠ Error fetching data for {city_name}: {str(e)}")
        return None

def display_city_weather(city_name, forecast_days=3):
    """Display comprehensive weather information for a city"""
    print(f"\n{'='*50}\n🌦 {city_name.upper()} WEATHER FORECAST\n{'='*50}")

    weather_df = get_weather_forecast(city_name, forecast_days)
    if weather_df is None:
        print("Failed to fetch weather data")
        return

    # Daily summary
    daily_df = weather_df.resample('D', on='datetime').agg({
        'temp': ['mean', 'min', 'max'],
        'humidity': 'mean',
        'rain': 'sum',
        'wind_speed': 'mean'
    })

    print("\n📅 DAILY SUMMARY:")
    print(daily_df.round(1))

    # Plotting
    plt.figure(figsize=(12, 8))

    # Temperature plot
    plt.subplot(2, 2, 1)
    weather_df.groupby(weather_df['datetime'].dt.date)['temp'].plot(legend=True)
    plt.title("Temperature Trends")
    plt.ylabel("°C")

    # Humidity plot
    plt.subplot(2, 2, 2)
    weather_df.groupby(weather_df['datetime'].dt.date)['humidity'].plot(legend=True)
    plt.title("Humidity Trends")
    plt.ylabel("%")

    # Rainfall plot
    plt.subplot(2, 2, 3)
    daily_df['rain'].plot(kind='bar')
    plt.title("Daily Rainfall")
    plt.ylabel("mm")

    # Wind plot
    plt.subplot(2, 2, 4)
    weather_df.groupby(weather_df['datetime'].dt.date)['wind_speed'].plot(legend=True)
    plt.title("Wind Speed")
    plt.ylabel("m/s")

    plt.tight_layout()
    plt.show()

    # Create map
    m = folium.Map(location=[INDIAN_CITIES[city_name]['lat'], INDIAN_CITIES[city_name]['lon']], zoom_start=10)
    folium.Marker(
        [INDIAN_CITIES[city_name]['lat'], INDIAN_CITIES[city_name]['lon']],
        popup=f"<b>{city_name}</b><br>Avg Temp: {daily_df['temp']['mean'].mean():.1f}°C",
        icon=folium.Icon(color='red')
    ).add_to(m)

    # Add weather layer
    folium.TileLayer(
        tiles=f"https://tile.openweathermap.org/map/precipitation_new/{{z}}/{{x}}/{{y}}.png?appid={OPENWEATHER_API_KEY}",
        attr='OpenWeatherMap',
        name='Precipitation'
    ).add_to(m)

    folium.LayerControl().add_to(m)
    display(m)

def compare_cities():
    """Compare weather across multiple Indian cities"""
    print("\n" + "="*50)
    print("🇮🇳 INDIAN CITIES WEATHER COMPARISON")
    print("="*50)

    print("\nAvailable Cities:")
    city_list = list(INDIAN_CITIES.keys())
    for i, city in enumerate(city_list, 1):
        print(f"{i}. {city}")

    while True:
        selected = input("\nSelect cities (comma separated numbers): ")
        try:
            selected_indices = [int(i.strip()) - 1 for i in selected.split(",")]
            selected_cities = [city_list[i] for i in selected_indices if 0 <= i < len(city_list)]
            if selected_cities:
                break
            else:
                print("Invalid selection. Please enter valid city numbers.")
        except ValueError:
            print("Invalid input. Please enter a comma-separated list of numbers.")

    while True:
        try:
            forecast_days_input = input("Forecast days (1-7): ")
            forecast_days = min(7, max(1, int(forecast_days_input)))
            break
        except ValueError:
            print("Invalid input. Please enter a number between 1 and 7.")


    comparison_data = []
    for city in selected_cities:
        df = get_weather_forecast(city, forecast_days)
        if df is not None:
            daily_df = df.resample('D', on='datetime').agg({
                'temp': 'mean',
                'temp_min': 'min',
                'temp_max': 'max',
                'humidity': 'mean',
                'rain': 'sum'
            })
            comparison_data.append(daily_df.assign(City=city))

    if comparison_data:
        result_df = pd.concat(comparison_data)

        # Plot comparison
        plt.figure(figsize=(15, 8))

        # Temperature comparison
        plt.subplot(2, 2, 1)
        for city in selected_cities:
            city_data = result_df[result_df['City'] == city]
            plt.plot(city_data.index, city_data['temp'], label=city)
        plt.title("Average Temperature Comparison")
        plt.ylabel("°C")
        plt.legend()

        # Rainfall comparison
        plt.subplot(2, 2, 2)
        for city in selected_cities:
            city_data = result_df[result_df['City'] == city]
            plt.bar(city_data.index, city_data['rain'], label=city, alpha=0.7)
        plt.title("Rainfall Comparison")
        plt.ylabel("mm")
        plt.legend()

        # Humidity comparison
        plt.subplot(2, 2, 3)
        for city in selected_cities:
            city_data = result_df[result_df['City'] == city]
            plt.plot(city_data.index, city_data['humidity'], label=city)
        plt.title("Humidity Comparison")
        plt.ylabel("%")
        plt.legend()

        # Min/Max temp comparison
        plt.subplot(2, 2, 4)
        for city in selected_cities:
            city_data = result_df[result_df['City'] == city]
            plt.errorbar(city_data.index, city_data['temp'],
                        yerr=[city_data['temp']-city_data['temp_min'],
                              city_data['temp_max']-city_data['temp']],
                        label=city, capsize=5)
        plt.title("Temperature Range Comparison")
        plt.ylabel("°C")
        plt.legend()

        plt.tight_layout()
        plt.show()

# Main menu
def main():
    while True:
        print("\n" + "="*50)
        print("🌏 INDIAN WEATHER FORECAST SYSTEM")
        print("="*50)
        print("1. View city weather details")
        print("2. Compare multiple cities")
        print("3. Exit")

        choice = input("\nSelect option (1-3): ")

        if choice == "1":
            print("\nAvailable Cities:")
            city_list = list(INDIAN_CITIES.keys())
            for i, city in enumerate(city_list, 1):
                print(f"{i}. {city}")
            while True:
                try:
                    city_choice = int(input("\nSelect city: ")) - 1
                    if 0 <= city_choice < len(city_list):
                        city_name = city_list[city_choice]
                        display_city_weather(city_name)
                        break
                    else:
                        print("Invalid selection. Please enter a valid city number.")
                except ValueError:
                    print("Invalid input. Please enter a number.")

        elif choice == "2":
            compare_cities()

        elif choice == "3":
            print("Exiting...")
            break

        else:
            print("Invalid choice. Try again.")

# Run the program
main()