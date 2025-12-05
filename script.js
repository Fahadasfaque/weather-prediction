// ⚠️ IMPORTANT: In production, move this to a backend service!
const API_KEY = "faecc2d411cae31997bf7ba82cb62725";
const API_BASE = "https://api.openweathermap.org/data/2.5/forecast";
const TILE_URL = "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png";

const INDIAN_CITIES = {
    "Delhi": {lat: 28.6139, lon: 77.2090}, "Mumbai": {lat: 19.0760, lon: 72.8777},
    "Kolkata": {lat: 22.5726, lon: 88.3639}, "Chennai": {lat: 13.0827, lon: 80.2707},
    "Bengaluru": {lat: 12.9716, lon: 77.5946}, "Hyderabad": {lat: 17.3850, lon: 78.4867},
    "Ahmedabad": {lat: 23.0225, lon: 72.5714}, "Lucknow": {lat: 26.8467, lon: 80.9462},
    "Bhopal": {lat: 23.2599, lon: 77.4126}, "Jaipur": {lat: 26.9124, lon: 75.7873},
    "Patna": {lat: 25.5941, lon: 85.1376}, "Ranchi": {lat: 23.3441, lon: 85.3096},
    "Bhubaneswar": {lat: 20.2961, lon: 85.8245}, "Guwahati": {lat: 26.1445, lon: 91.7362},
    "Imphal": {lat: 24.8170, lon: 93.9368}, "Agartala": {lat: 23.8315, lon: 91.2868},
    "Gangtok": {lat: 27.3389, lon: 88.6065}, "Aizawl": {lat: 23.7271, lon: 92.7176},
    "Itanagar": {lat: 27.0844, lon: 93.6053}, "Kohima": {lat: 25.6747, lon: 94.1100},
    "Shillong": {lat: 25.5788, lon: 91.8933}, "Panaji": {lat: 15.4909, lon: 73.8278},
    "Puducherry": {lat: 11.9139, lon: 79.8145}, "Port Blair": {lat: 11.6234, lon: 92.7265},
    "Chandigarh": {lat: 30.7333, lon: 76.7794}, "Leh": {lat: 34.1526, lon: 77.5771},
    "Srinagar": {lat: 34.0837, lon: 74.7973}, "Dehradun": {lat: 30.3165, lon: 78.0322},
    "Shimla": {lat: 31.1048, lon: 77.1734}, "Raipur": {lat: 21.2514, lon: 81.6296},
    "Thiruvananthapuram": {lat: 8.5241, lon: 76.9366}, "Dispur": {lat: 26.1433, lon: 91.7898}
};

let charts = {}, map = null, precipitationLayer = null;

// DOM Elements
const elements = {
    citySelect: document.getElementById('city-select'),
    forecastDays: document.getElementById('forecast-days'),
    getWeatherBtn: document.getElementById('get-weather-btn'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    weatherResults: document.getElementById('weather-results'),
    cityTitle: document.getElementById('city-title'),
    summaryCards: document.getElementById('summary-cards'),
    cityCheckboxes: document.getElementById('city-checkboxes'),
    compareBtn: document.getElementById('compare-btn'),
    compareForecastDays: document.getElementById('compare-forecast-days'),
    compareLoading: document.getElementById('compare-loading'),
    compareError: document.getElementById('compare-error'),
    compareResults: document.getElementById('compare-results'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateCitySelect();
    populateCityCheckboxes();
    setupTabSwitching();
    setupEventListeners();
});

// Setup Functions
function populateCitySelect() {
    Object.keys(INDIAN_CITIES).forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        elements.citySelect.appendChild(option);
    });
}

function populateCityCheckboxes() {
    Object.keys(INDIAN_CITIES).forEach(city => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = city;
        checkbox.className = 'city-checkbox';
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(city));
        elements.cityCheckboxes.appendChild(label);
    });
}

function setupTabSwitching() {
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            if (tabName === 'single' && map) setTimeout(() => map.invalidateSize(), 100);
        });
    });
}

function setupEventListeners() {
    elements.getWeatherBtn.addEventListener('click', getWeather);
    elements.compareBtn.addEventListener('click', compareCities);
}

// API Functions
async function getWeatherForecast(cityName, forecastDays = 2) {
    try {
        const coords = INDIAN_CITIES[cityName];
        const url = `${API_BASE}?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        return data.list.slice(0, forecastDays * 8).map(item => ({
            datetime: new Date(item.dt * 1000),
            temp: item.main.temp,
            temp_min: item.main.temp_min,
            temp_max: item.main.temp_max,
            humidity: item.main.humidity,
            pressure: item.main.pressure,
            wind_speed: item.wind.speed,
            rain: item.rain ? item.rain['3h'] || 0 : 0,
            description: item.weather[0].description
        }));
    } catch (error) {
        throw new Error(`Failed to fetch data for ${cityName}`);
    }
}

function processDailyData(forecastData) {
    const dailyData = {};
    forecastData.forEach(entry => {
        const date = entry.datetime.toDateString();
        if (!dailyData[date]) {
            dailyData[date] = {temps: [], temp_mins: [], temp_maxs: [], humidities: [], rains: [], wind_speeds: [], descriptions: []};
        }
        dailyData[date].temps.push(entry.temp);
        dailyData[date].temp_mins.push(entry.temp_min);
        dailyData[date].temp_maxs.push(entry.temp_max);
        dailyData[date].humidities.push(entry.humidity);
        dailyData[date].rains.push(entry.rain);
        dailyData[date].wind_speeds.push(entry.wind_speed);
        dailyData[date].descriptions.push(entry.description);
    });
    return Object.keys(dailyData).map(date => ({
        date: date,
        temp_avg: dailyData[date].temps.reduce((a,b) => a+b, 0) / dailyData[date].temps.length,
        temp_min: Math.min(...dailyData[date].temp_mins),
        temp_max: Math.max(...dailyData[date].temp_maxs),
        humidity_avg: dailyData[date].humidities.reduce((a,b) => a+b, 0) / dailyData[date].humidities.length,
        rain_total: dailyData[date].rains.reduce((a,b) => a+b, 0),
        wind_speed_avg: dailyData[date].wind_speeds.reduce((a,b) => a+b, 0) / dailyData[date].wind_speeds.length,
        description: dailyData[date].descriptions.sort((a,b) => dailyData[date].descriptions.filter(v => v === a).length - dailyData[date].descriptions.filter(v => v === b).length).pop()
    }));
}

// Weather Display
async function getWeather() {
    const cityName = elements.citySelect.value;
    const forecastDays = parseInt(elements.forecastDays.value);
    if (!cityName) return showError('Please select a city');
    
    hideError();
    hideResults();
    showLoading();

    try {
        const forecastData = await getWeatherForecast(cityName, forecastDays);
        const dailyData = processDailyData(forecastData);
        displayCityWeather(cityName, dailyData, forecastData);
        hideLoading();
        showResults();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayCityWeather(cityName, dailyData, hourlyData) {
    elements.cityTitle.textContent = `${cityName} Weather Forecast`;
    elements.summaryCards.innerHTML = dailyData.map(day => `
        <div class="summary-card">
            <h4>${new Date(day.date).toLocaleDateString('en-US', {weekday: 'short', day: 'numeric', month: 'short'})}</h4>
            <div class="value">${day.temp_avg.toFixed(1)}<span class="unit">°C</span></div>
            <div style="font-size: 0.9rem; margin-top: 5px;">${day.description}</div>
            <div style="font-size: 0.8rem; margin-top: 10px; opacity: 0.8;">
                <i class="fas fa-tint"></i> ${day.rain_total.toFixed(1)}mm | 
                <i class="fas fa-wind"></i> ${day.wind_speed_avg.toFixed(1)}m/s
            </div>
        </div>
    `).join('');
    
    renderTemperatureChart(hourlyData);
    renderHumidityChart(hourlyData);
    renderRainChart(dailyData);
    renderWindChart(hourlyData);
    renderMap(cityName, dailyData[0].temp_avg);
}

// Chart Functions
function renderTemperatureChart(hourlyData) {
    const ctx = document.getElementById('temp-chart');
    if (charts.temp) charts.temp.destroy();
    const labels = hourlyData.map(d => d.datetime.toLocaleString('en-US', {hour: '2-digit', hour12: true}));
    charts.temp = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: hourlyData.map(d => d.temp),
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: false, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderHumidityChart(hourlyData) {
    const ctx = document.getElementById('humidity-chart');
    if (charts.humidity) charts.humidity.destroy();
    charts.humidity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(d => d.datetime.toLocaleString('en-US', {hour: '2-digit', hour12: true})),
            datasets: [{
                label: 'Humidity (%)',
                data: hourlyData.map(d => d.humidity),
                borderColor: '#4cc9f0',
                backgroundColor: 'rgba(76, 201, 240, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: true, max: 100, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderRainChart(dailyData) {
    const ctx = document.getElementById('rain-chart');
    if (charts.rain) charts.rain.destroy();
    charts.rain = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailyData.map(d => new Date(d.date).toLocaleDateString('en-US', {weekday: 'short'})),
            datasets: [{
                label: 'Rainfall (mm)',
                data: dailyData.map(d => d.rain_total),
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: '#667eea',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: true, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderWindChart(hourlyData) {
    const ctx = document.getElementById('wind-chart');
    if (charts.wind) charts.wind.destroy();
    charts.wind = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(d => d.datetime.toLocaleString('en-US', {hour: '2-digit', hour12: true})),
            datasets: [{
                label: 'Wind Speed (m/s)',
                data: hourlyData.map(d => d.wind_speed),
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: true, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderMap(cityName, avgTemp) {
    const coords = INDIAN_CITIES[cityName];
    if (map) map.remove();
    
    map = L.map('map').setView([coords.lat, coords.lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    L.marker([coords.lat, coords.lon]).addTo(map)
        .bindPopup(`<b>${cityName}</b><br>Avg Temp: ${avgTemp.toFixed(1)}°C`)
        .openPopup();
    
    precipitationLayer = L.tileLayer(`${TILE_URL}.png?appid=${API_KEY}`, {
        attribution: 'OpenWeatherMap'
    });
    map.addLayer(precipitationLayer);
}

// Comparison Functions
async function compareCities() {
    const selectedCities = Array.from(document.querySelectorAll('.city-checkbox:checked')).map(cb => cb.value);
    const forecastDays = parseInt(elements.compareForecastDays.value);
    
    if (selectedCities.length < 2) return showCompareError('Select at least 2 cities');
    if (selectedCities.length > 5) return showCompareError('Max 5 cities for performance');
    
    hideCompareError();
    hideCompareResults();
    showCompareLoading();

    try {
        const comparisonData = {};
        for (const city of selectedCities) {
            const forecastData = await getWeatherForecast(city, forecastDays);
            comparisonData[city] = processDailyData(forecastData);
        }
        renderComparisonCharts(comparisonData);
        hideCompareLoading();
        showCompareResults();
    } catch (error) {
        hideCompareLoading();
        showCompareError(error.message);
    }
}

function renderComparisonCharts(comparisonData) {
    const cities = Object.keys(comparisonData);
    const days = comparisonData[cities[0]].map(d => d.date);
    const dayLabels = days.map(d => new Date(d).toLocaleDateString('en-US', {weekday: 'short', day: 'numeric'}));
    
    renderCompareTempChart(cities, comparisonData, dayLabels);
    renderCompareRainChart(cities, comparisonData, dayLabels);
    renderCompareHumidityChart(cities, comparisonData, dayLabels);
    renderCompareRangeChart(cities, comparisonData, dayLabels);
}

function renderCompareTempChart(cities, data, labels) {
    const ctx = document.getElementById('compare-temp-chart');
    if (charts.compareTemp) charts.compareTemp.destroy();
    charts.compareTemp = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: cities.map((city, i) => ({
                label: city,
                data: data[city].map(d => d.temp_avg),
                borderColor: getColor(i),
                backgroundColor: getColor(i, 0.1),
                tension: 0.4,
                fill: false
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {color: 'rgba(255, 255, 255, 0.8)'}
                }
            },
            scales: {
                y: {beginAtZero: false, title: {display: true, text: 'Temperature (°C)', color: 'rgba(255, 255, 255, 0.8)'}, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderCompareRainChart(cities, data, labels) {
    const ctx = document.getElementById('compare-rain-chart');
    if (charts.compareRain) charts.compareRain.destroy();
    charts.compareRain = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: cities.map((city, i) => ({
                label: city,
                data: data[city].map(d => d.rain_total),
                backgroundColor: getColor(i, 0.7),
                borderColor: getColor(i),
                borderWidth: 1
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {color: 'rgba(255, 255, 255, 0.8)'}
                }
            },
            scales: {
                y: {beginAtZero: true, title: {display: true, text: 'Rainfall (mm)', color: 'rgba(255, 255, 255, 0.8)'}, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderCompareHumidityChart(cities, data, labels) {
    const ctx = document.getElementById('compare-humidity-chart');
    if (charts.compareHumidity) charts.compareHumidity.destroy();
    charts.compareHumidity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: cities.map((city, i) => ({
                label: city,
                data: data[city].map(d => d.humidity_avg),
                borderColor: getColor(i),
                backgroundColor: getColor(i, 0.1),
                tension: 0.4,
                fill: false
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {color: 'rgba(255, 255, 255, 0.8)'}
                }
            },
            scales: {
                y: {beginAtZero: true, max: 100, title: {display: true, text: 'Humidity (%)', color: 'rgba(255, 255, 255, 0.8)'}, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function renderCompareRangeChart(cities, data, labels) {
    const ctx = document.getElementById('compare-range-chart');
    if (charts.compareRange) charts.compareRange.destroy();
    
    charts.compareRange = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: cities.flatMap((city, i) => [
                {
                    label: `${city} (Min)`,
                    data: data[city].map(d => d.temp_min),
                    borderColor: getColor(i),
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: '+1'
                },
                {
                    label: `${city} (Max)`,
                    data: data[city].map(d => d.temp_max),
                    borderColor: getColor(i),
                    backgroundColor: getColor(i, 0.1),
                    pointRadius: 0,
                    fill: '-1'
                }
            ])
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        filter: (legendItem) => legendItem.text.includes('Max')
                    }
                }
            },
            scales: {
                y: {beginAtZero: false, title: {display: true, text: 'Temperature (°C)', color: 'rgba(255, 255, 255, 0.8)'}, grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}},
                x: {grid: {color: 'rgba(255, 255, 255, 0.1)'}, ticks: {color: 'rgba(255, 255, 255, 0.7)'}}
            }
        }
    });
}

function getColor(index, alpha = 1) {
    const colors = [
        `rgba(255, 107, 107, ${alpha})`, `rgba(76, 201, 240, ${alpha})`,
        `rgba(46, 204, 113, ${alpha})`, `rgba(155, 89, 182, ${alpha})`,
        `rgba(241, 196, 15, ${alpha})`, `rgba(230, 126, 34, ${alpha})`,
        `rgba(231, 76, 60, ${alpha})`, `rgba(52, 152, 219, ${alpha})`
    ];
    return colors[index % colors.length];
}

// UI Helpers
function showLoading() { elements.loading.classList.remove('hidden'); }
function hideLoading() { elements.loading.classList.add('hidden'); }
function showError(message) { elements.error.textContent = message; elements.error.classList.remove('hidden'); }
function hideError() { elements.error.classList.add('hidden'); }
function showResults() { elements.weatherResults.classList.remove('hidden'); }
function hideResults() { elements.weatherResults.classList.add('hidden'); }
function showCompareLoading() { elements.compareLoading.classList.remove('hidden'); }
function hideCompareLoading() { elements.compareLoading.classList.add('hidden'); }
function showCompareError(message) { elements.compareError.textContent = message; elements.compareError.classList.remove('hidden'); }
function hideCompareError() { elements.compareError.classList.add('hidden'); }
function showCompareResults() { elements.compareResults.classList.remove('hidden'); }
function hideCompareResults() { elements.compareResults.classList.add('hidden'); }