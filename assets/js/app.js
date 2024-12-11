'use strict';

import { fetchData, url } from "./api.js";
import * as module from "./module.js";


/**
 * Add event listeners to multiple elements
 * @param {NodeList} elements Elements node array
 * @param {string} eventType Event Type e.g.: "click", "mouseover"
 * @param {Function} callback Callback Function 
 */
const addEventOnElements = function (elements, eventType, callback) {
    for (const element of elements) element.addEventListener(eventType, callback);
}

// Search in mobile devices

const searchView = document.querySelector("[data-search-view]");
const searchTogglers = document.querySelectorAll("[data-search-toggler]");

const toggleSearch = () => searchView.classList.toggle("active");
addEventOnElements(searchTogglers, "click", toggleSearch);

// Search Integration

const searchField = document.querySelector("[data-search-field]");
const searchResult = document.querySelector("[data-search-result]");

let searchTimeout = null;
const searchTimeoutDuration = 500;

searchField.addEventListener("input", function () {

    searchTimeout ?? clearTimeout(searchTimeout);

    if(searchField.value) {
        searchResult.classList.remove("active");
        searchResult.innerHTML ="";
        searchField.classList.remove("searching");
    } else {
        searchField.classList.add("searching");
    }

    if (searchField.value) {
        searchTimeout = setTimeout(() => {
            fetchData(url.geo(searchField.value), function (locations) {
                searchField.classList.remove("searching");
                searchResult.classList.add("active");
                searchResult.innerHTML = `
                    <ul class="view-list" data-search-list></ul>
                `;
                const /** {NodeList} | [] */ items = [];

                for (const { name, lat, lon, country, state } of locations) {
                    const searchItem = document.createElement("li");
                    searchItem.classList.add("view-item");

                    searchItem.innerHTML = `
                        <span class="m-icon">location_on</span>

                        <div>
                            <p class="item-title">${name}</p>

                            <p class="label-2 item-subtitle">${state || ""} ${country}</p>
                        </div>

                        <a href="#/weather?lat=${lat}&lon=${lon}" class="item-link has-state" aria-label="${name} weather" data-search-toggler=""></a>
                    `;

                    searchResult.querySelector("[data-search-list]").appendChild(searchItem);
                    items.push(searchItem.querySelector("[data-search-toggler]"));
                }

                addEventOnElements(items, "click", function () {
                    toggleSearch();
                    searchResult.classList.remove("active");
                })
            });
        }, searchTimeoutDuration);
    }

});

const container = document.querySelector("[data-container]");
const loading = document.querySelector("[data-loading]");
const currentLocationBtn = document.querySelector("[data-current-location-btn]");
const errorContent = document.querySelector("[data-error-content]");


/**
 * Render all weather data in html page
 * 
 * @param {number} lat latitude
 * @param {number} lon longtitude
 */
export const updateWeather = function (lat, lon) {

    loading.style.display = "grid";
    container.style.overflowY = "hidden";
    container.classList.remove("fade-in");
    errorContent.style.display = "none";

    const currentWeatherSection = document.querySelector("[data-current-weather]");
    const highlightSection = document.querySelector("[data-highlights]");
    const hourlySection = document.querySelector("[data-hourly-forecast]");
    const forecastSection = document.querySelector("[data-5-day-forecast]");
    const mapSection = document.querySelector("[data-map]");
    const mapToggler = document.querySelector("[data-map-toggler]");
    const mapContainer = mapSection.querySelector("#map");

    currentWeatherSection.innerHTML = "";
    highlightSection.innerHTML = "";
    hourlySection.innerHTML = "";
    forecastSection.innerHTML = "";

    mapToggler.addEventListener("click", function () {
        mapSection.classList.toggle("active");
        mapToggler.classList.toggle("active");
    });
    
    if (!mapSection.mapInstance) {
        // Initialize the map only once
        const map = L.map(mapContainer).setView([lat, lon], 10);
        mapSection.mapInstance = map;
    
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        /* For cartodb's tiles and better styling atleast for me it has better style :)
        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        */
    
        // Add event listener for map clicks
        map.on('click', function (e) {
            const { lat, lng } = e.latlng;
    
            // Update weather for the clicked location
            updateWeather(lat, lng);
        });
    }
    
    // Add or update the marker for the current location
    if (mapSection.marker) {
        mapSection.marker.setLatLng([lat, lon]); // Update marker position
    } else {
        mapSection.marker = L.marker([lat, lon]).addTo(mapSection.mapInstance);
    }
    

    if (window.location.hash === "/current-location") {
        currentLocationBtn.setAttribute("disabled", "");
    } else {
        currentLocationBtn.removeAttribute("disabled");
    }

    // Current weather section
    fetchData(url.currentWeather(lat, lon), function (currentWeather) {

        const {
            weather,
            dt: dateUnix,
            sys: { sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC },
            main: { temp, feels_like, pressure, humidity },
            visibility,
            timezone
        } = currentWeather
        const [{ description, icon }] = weather;

        const card = document.createElement("div");
        currentWeatherSection.innerHTML = "";
        card.classList.add("card", "card-lg", "current-weather-card");

        card.innerHTML = `
            <h2 class="title-2 card-title">Now</h2>

            <div class="weapper">
                <p class="heading">${parseInt(temp)}&deg;<sup>c</sup></p>

                <img src="./assets/images/weather_icons/${icon}.png" width="64" height="64" alt="${description}" class="weather-icon">
            </div>

            <p class="body-3">${description}</p>

            <ul class="meta-list">

                <li class="meta-item">
                    <span class="m-icon">calendar_today</span>

                    <p class="title-3 meta-text">${module.getDate(dateUnix, timezone)}</p>
                </li>

                <li class="meta-item">
                    <span class="m-icon">location_on</span>

                    <p class="title-3 meta-text" data-location></p>
                </li>

            </ul>
        `;

        fetchData(reverseGeoUrl.reverseGeo(lat, lon), function (data) {
            const results = data.results;
    
            if (results && results.length > 0) {
                const locationData = results[0];
                const name = locationData.components.city || locationData.components.town || locationData.components.village || "Unknown Location";
                const country = locationData.components.country || "Unknown Country";
    
                card.querySelector("[data-location]").innerHTML = `${name}, ${country}`;
            } else {
                console.log("No results found for the given coordinates");
            }
        });

        currentWeatherSection.appendChild(card);
        

        if (typeof lat === 'number' && typeof lon === 'number') {
        
            if (mapSection.mapInstance) {
                mapSection.mapInstance.setView([lat, lon], 10);
            } else {
                const map = L.map(mapContainer).setView([lat, lon], 10);
                mapSection.mapInstance = map;
        
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            }
        
            if (mapSection.marker) {
                mapSection.marker.setLatLng([lat, lon]);
            } else {
                mapSection.marker = L.marker([lat, lon]).addTo(mapSection.mapInstance);
            }
        } else {
            console.error("Invalid coordinates for the map:", lat, lon);
        }

        console.log("Latitude:", lat, "Longitude:", lon);


        // Today's Highlights
        fetchData(url.airPollution(lat, lon), function (airPollution) {

            const [{
                main: {aqi},
                components: { no2, o3, so2, pm2_5 }
            }] = airPollution.list;

            const card = document.createElement("div");
            card.classList.add("card", "card-lg" );

            card.innerHTML = `
                <h2 class="title-2" id="highlights-label">Todays Highlights</h2>

                <div class="highlights-list">

                    <div class="card card-sm highlight-card one">

                        <h3 class="title-3">Air Quality Index</h3>

                        <div class="wrapper">

                            <span class="m-icon">air</span>

                            <ul class="card-list">

                                <li class="card-item">
                                    <p class="title-1">${pm2_5.toPrecision(3)}</p>

                                    <p class="label-1">PM <sub>2.5</sub></p>
                                </li>

                                <li class="card-item">
                                    <p class="title-1">${so2.toPrecision(3)}</p>

                                    <p class="label-1">SO <sub>2</sub></p>
                                </li>

                                <li class="card-item">
                                    <p class="title-1">${no2.toPrecision(3)}</p>

                                    <p class="label-1">NO <sub>2</sub></p>
                                </li>

                                <li class="card-item">
                                    <p class="title-1">${o3.toPrecision(3)}</p>

                                    <p class="label-1">O <sub>3</sub></p>
                                </li>

                            </ul>

                        </div>

                        <span class="badge aqi-${aqi} label-${aqi}" title="${module.aqiText[aqi].message}">
                            ${module.aqiText[aqi].level}
                        </span>

                    </div>

                    <div class="card card-sm highlight-card two">

                        <h3 class="title-3">Sunrise & Sunset</h3>

                        <div class="card-list">

                            <div class="card-item">
                                <span class="m-icon">clear_day</span>

                                <div>
                                    <p class="label-1">Sunrise</p>

                                    <p class="title-1">${module.getTime(sunriseUnixUTC, timezone)}</p>
                                </div>
                            </div>

                            <div class="card-item">
                                <span class="m-icon">clear_night</span>

                                <div>
                                    <p class="label-1">Sunset</p>

                                    <p class="title-1">${module.getTime(sunsetUnixUTC, timezone)}</p>
                                </div>
                            </div>

                        </div>
                        
                    </div>

                    <div class="card card-sm highlight-card">

                        <h3 class="title-3">Humidity</h3>

                        <div class="wrapper">
                            <span class="m-icon">humidity_percentage</span>

                            <p class="title-1">${humidity} <sub>%</sub></p>
                        </div>

                    </div>

                    <div class="card card-sm highlight-card">

                        <h3 class="title-3">Pressure</h3>

                        <div class="wrapper">
                            <span class="m-icon">airwave</span>

                            <p class="title-1">${pressure}<sub>hPa</sub></p>
                        </div>

                    </div>

                    <div class="card card-sm highlight-card">

                        <h3 class="title-3">Visibility</h3>

                        <div class="wrapper">
                            <span class="m-icon">visibility</span>

                            <p class="title-1">${visibility / 1000}<sub>km</sub></p>
                        </div>

                    </div>

                    <div class="card card-sm highlight-card">

                        <h3 class="title-3">Feels like</h3>

                        <div class="wrapper">
                            <span class="m-icon">thermostat</span>

                            <p class="title-1">${parseInt(feels_like)}&deg;<sup>c</sup></p>
                        </div>

                    </div>

                </div>
            `;

            highlightSection.appendChild(card);

        });

        //24H Forecast
        fetchData(url.forecast(lat, lon), function (forecast) {

            const {
                list: forecastList,
                city: { timezone }
            } = forecast;

            hourlySection.innerHTML = `
                <h2 class="title-2">Today at</h2>

                <div class="slider-container">
                    <ul class="slider-list" data-temp></ul>

                    <ul class="slider-list" data-wind></ul>
                </div>
            `;

            for (const [index, data] of forecastList.entries()) {

                if (index > 7) break;

                const {
                    dt: dateTimeUnix,
                    main: { temp },
                    weather,
                    wind: { deg: windDirection, speed: windSpeed }
                } = data
                const [{ icon, description }] = weather

                const tempLi = document.createElement("li");
                tempLi.classList.add("slider-item");

                tempLi.innerHTML = `
                    <div class="card card-sm slider-card">

                        <p class="body-3">${module.getHours(dateTimeUnix, timezone)}</p>

                        <img src="./assets/images/weather_icons/${icon}.png" width="48" height="48" loading="lazy" alt="${description}" class="weather-icon" title="${description}">

                        <p class="body-3">${parseInt(temp)}&deg;</p>

                    </div>
                `;
                hourlySection.querySelector("[data-temp]").appendChild(tempLi);

                const windLi = document.createElement("li");
                windLi.classList.add("slider-item");

                windLi.innerHTML = `
                <div class="card card-sm slider-card">

                    <p class="body-3">${module.getHours(dateTimeUnix, timezone)}</p>

                    <img src="./assets/images/weather_icons/direction.png" width="48" height="48" loading="lazy" alt="direction" class="weather-icon" style="transform: rotate(${windDirection - 180}deg)">

                    <p class="body-3">${parseInt(module.mps_to_kmh(windSpeed))} km/h</p>

                </div>
                `;
                hourlySection.querySelector("[data-wind]").appendChild(windLi);

            }

            // 5 Days Forecast Section
            forecastSection.innerHTML = `
                <h2 class="title-2" id="forecast-label">5 Days Forecast</h2>

                <div class="card card-lg forecast-card">
                    <ul data-forecast-list></ul>
                </div>
            `;

            for (let i = 7, len = forecastList.length; i < len; i+= 8) {

                const {
                    main: { temp_max },
                    weather,
                    dt_txt
                } = forecastList[i];
                const [{ icon, description }] = weather
                const date = new Date(dt_txt);

                const li = document.createElement("li");
                li.classList.add("card-item");

                li.innerHTML = `
                <div class="icon-wrapper">
                    <img src="./assets/images/weather_icons/${icon}.png" width="36" height="36" alt="${description}" class="weather-icon" title="${description}">

                    <span class="span">
                        <p class="title-2">${parseInt(temp_max)}&deg;</p>
                    </span>
                </div>

                <p class="label-1">${date.getDate()} ${module.monthNames[date.getUTCMonth()]}</p>

                <p class="label-1">${module.weekDayNames[date.getUTCDay()]}</p>
                `;
                forecastSection.querySelector("[data-forecast-list]").appendChild(li);

            }

            loading.style.display = "none";
            container.style.overflowY = "overlay";
            container.classList.add("fade-in");
        });

    });



}

export const error404 = () => errorContent.style.display = "flex";
