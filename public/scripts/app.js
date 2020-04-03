(function () {
  "use strict";

  var injectedForecast = {
    key: "newyork",
    label: "New York, NY",
    currently: {
      time: 1453489481,
      summary: "Clear",
      icon: "partly-cloudy-day",
      temperature: 52.74,
      apparentTemperature: 74.34,
      precipProbability: 0.2,
      humidity: 0.77,
      windBearing: 125,
      windSpeed: 1.52,
    },
    daily: {
      data: [
        { icon: "clear-day", temperatureMax: 55, temperatureMin: 34 },
        { icon: "rain", temperatureMax: 55, temperatureMin: 34 },
        { icon: "snow", temperatureMax: 55, temperatureMin: 34 },
        { icon: "sleet", temperatureMax: 55, temperatureMin: 34 },
        { icon: "fog", temperatureMax: 55, temperatureMin: 34 },
        { icon: "wind", temperatureMax: 55, temperatureMin: 34 },
        { icon: "partly-cloudy-day", temperatureMax: 55, temperatureMin: 34 },
      ],
    },
  };

  var weatherAPIUrlBase = "https://publicdata-weather.firebaseio.com/";

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector(".loader"),
    cardTemplate: document.querySelector(".cardTemplate"),
    container: document.querySelector(".main"),
    addDialog: document.querySelector(".dialog-container"),
    daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  };

  document.getElementById("butRefresh").addEventListener("click", function () {
    app.updateForecasts();
  });

  document.getElementById("butAdd").addEventListener("click", function () {
    app.toggleAddDialog(true);
  });

  document.getElementById("butAddCity").addEventListener("click", function () {
    var select = document.getElementById("selectCityToAdd");
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({ key: key, label: label });
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document
    .getElementById("butAddCancel")
    .addEventListener("click", function () {
      app.toggleAddDialog(false);
    });

  app.toggleAddDialog = function (visible) {
    if (visible) {
      app.addDialog.classList.add("dialog-container--visible");
    } else {
      app.addDialog.classList.remove("dialog-container--visible");
    }
  };

  app.updateForecastCard = function (data) {
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove("cardTemplate");
      card.querySelector(".location").textContent = data.label;
      card.removeAttribute("hidden");
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verify data is newer than what we already have, if not, bail.
    var dateElem = card.querySelector(".date");
    if (dateElem.getAttribute("data-dt") >= data.currently.time) {
      return;
    }

    dateElem.setAttribute("data-dt", data.currently.time);
    dateElem.textContent = new Date(data.currently.time * 1000);

    card.querySelector(".description").textContent = data.currently.summary;
    card.querySelector(".date").textContent = new Date(
      data.currently.time * 1000
    );
    card.querySelector(".current .icon").classList.add(data.currently.icon);
    card.querySelector(".current .temperature .value").textContent = Math.round(
      data.currently.temperature
    );
    card.querySelector(".current .feels-like .value").textContent = Math.round(
      data.currently.apparentTemperature
    );
    card.querySelector(".current .precip").textContent =
      Math.round(data.currently.precipProbability * 100) + "%";
    card.querySelector(".current .humidity").textContent =
      Math.round(data.currently.humidity * 100) + "%";
    card.querySelector(".current .wind .value").textContent = Math.round(
      data.currently.windSpeed
    );
    card.querySelector(".current .wind .direction").textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll(".future .oneday");
    var today = new Date();
    today = 2;
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector(".date").textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector(".icon").classList.add(daily.icon);
        nextDay.querySelector(".temp-high .value").textContent = Math.round(
          daily.temperatureMax
        );
        nextDay.querySelector(".temp-low .value").textContent = Math.round(
          daily.temperatureMin
        );
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute("hidden", true);
      app.container.removeAttribute("hidden");
      app.isLoading = false;
    }
  };

  app.getForecast = function (key, label) {
    var url = weatherAPIUrlBase + key + ".json";
    if ("caches" in window) {
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(function (json) {
            console.log("cached", json);
            json.key = key;
            json.label = label;
            app.updateForecastCard(json);
          });
        }
      });
    }

    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.updateForecastCard(response);
        }
      }
    };
    request.open("GET", url);
    request.send();
  };

  app.updateForecasts = function () {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function (key) {
      app.getForecast(key);
    });
  };

  // app.updateForecastCard(injectedForecast);

  app.saveSelectedCities = function () {
    window.localforage.setItem("selectedCities", app.selectedCities);
  };

  document.addEventListener("DOMContentLoaded", function () {
    window.localforage.getItem("selectedCities", function (err, cityList) {
      if (cityList) {
        app.selectedCities = cityList;
        app.selectedCities.forEach(function (city) {
          app.getForecast(city.key, city.label);
        });
      } else {
        app.updateForecastCard(injectedForecast);
        app.selectedCities = [
          { key: injectedForecast.key, label: injectedForecast.label },
        ];
        app.saveSelectedCities();
      }
    });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").then(function () {
      console.log("Service Worker Registered");
    });
  }
})();
