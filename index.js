const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = '99373581db2e664c1c8bedaa8b7c150a';

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('This is Ahmed\'s weather bot');
});

app.post('/webhook', async (req, res) => {
    console.log('Received a request from Dialogflow:', req.body);

    const intent = req.body.queryResult.intent.displayName;
    const parameters = req.body.queryResult.parameters;
    const contexts = req.body.queryResult.outputContexts;

    let responseText = '';
    let outputContexts = [];

    try {
        if (intent === 'Default Welcome Intent') {
            responseText = 'This is Ahmed weather bot. I can help you find the weather.';
        } 
        else if (intent === 'Weatherbot-1') {
            responseText = 'Please provide your city';
            outputContexts = [{
                name: `${req.body.session}/contexts/weather-followup`,
                lifespanCount: 5,
                parameters: {}
            }];
        }
        else if (intent === 'Weatherbot-2') {
            const city = parameters['geo-city'];
            const weatherApiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

            const response = await axios.get(weatherApiUrl);
            const weatherInfo = response.data.weather[0].description;
            const temperature = response.data.main.temp;

            responseText = `The current weather in ${city} is ${weatherInfo} with a temperature of ${temperature}°C.`;

            outputContexts = [{
                name: `${req.body.session}/contexts/weather-followup`,
                lifespanCount: 5,
                parameters: { city }
            }];
        }
        else if (intent === 'Weatherbot-3') {
            responseText = 'Please provide the start date';

            const context = contexts.find(ctx => ctx.name.endsWith('/contexts/weather-followup'));
            if (context && context.parameters.city) {
                outputContexts = [{
                    name: `${req.body.session}/contexts/forecast-weather-context`,
                    lifespanCount: 5,
                    parameters: { city: context.parameters.city }
                }];
            } else {
                outputContexts = [{
                    name: `${req.body.session}/contexts/forecast-weather-context`,
                    lifespanCount: 5,
                    parameters: {}
                }];
            }
        }
        else if (intent === 'Weatherbot-4') {
            responseText = 'Please provide your city: Forecast in city';

            const context = contexts.find(ctx => ctx.name.endsWith('/contexts/forecast-weather-context'));
            if (context && context.parameters.city) {
                outputContexts = [{
                    name: `${req.body.session}/contexts/forecast-weather-context`,
                    lifespanCount: 5,
                    parameters: { city: context.parameters.city, date: parameters['date'] }
                }];
            } else {
                outputContexts = [{
                    name: `${req.body.session}/contexts/forecast-weather-context`,
                    lifespanCount: 5,
                    parameters: { date: parameters['date'] }
                }];
            }
        }
        else if (intent === 'Weatherbot-5') {
            const city = parameters['geo-city'];
            const date = parameters['date'] || new Date().toISOString().split('T')[0]; // Use current date if date is not provided

            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 8);

            const weatherApiUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

            const response = await axios.get(weatherApiUrl);
            const forecasts = response.data.list;

            const filteredForecasts = forecasts.filter(forecast => {
                const forecastDate = new Date(forecast.dt_txt);
                return forecastDate >= startDate && forecastDate <= endDate;
            });

            if (filteredForecasts.length > 0) {
                const forecastDescriptions = filteredForecasts.map(forecast => {
                    const forecastDate = new Date(forecast.dt_txt).toDateString();
                    const forecastWeather = forecast.weather[0].description;
                    return `${forecastWeather} on ${forecastDate}`;
                }).join(', ');

                responseText = `The forecasted weather from ${startDate.toDateString()} to ${endDate.toDateString()} in ${city} is: \n ${forecastDescriptions}.`;
            } else {
                responseText = `No forecast available from ${startDate.toDateString()} to ${endDate.toDateString()} in ${city}.`;
            }

            outputContexts = [{
                name: `${req.body.session}/contexts/forecast-weather-context`,
                lifespanCount: 5,
                parameters: { city, date }
            }];
        }
    } catch (error) {
        console.error('Error handling request:', error);
        responseText = 'Sorry, there was an error processing your request. Please try again later.';
    }

    res.json({
        fulfillmentText: responseText,
        outputContexts: outputContexts
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
