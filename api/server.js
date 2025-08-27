const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@vercel/kv');

const app = express();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const APP_KEY = 'vega_stats';

app.use(bodyParser.json());
app.use(cors());

// Endpoint to get all data
app.get('/api/data', async (req, res) => {
    try {
        let stats = await kv.hgetall(APP_KEY);
        if (!stats || Object.keys(stats).length === 0) {
            stats = {
                downloads: {
                    'arm64-v8a': 0,
                    'armeabi-v7a': 0,
                    'universal': 0
                },
                ratings: {
                    '5': 590,
                    '4': 0,
                    '3': 0,
                    '2': 0,
                    '1': 0
                }
            };
            await kv.hset(APP_KEY, { ...stats });
        }
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint to track a download
app.post('/api/download', async (req, res) => {
    const { version } = req.body;
    if (!version) {
        return res.status(400).json({ success: false, message: 'Version is required' });
    }
    try {
        await kv.hincrby(APP_KEY, `downloads.${version}`, 1);
        res.status(200).json({ success: true, message: 'Download tracked' });
    } catch (error) {
        console.error('Error tracking download:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Endpoint to save a rating
app.post('/api/rating', async (req, res) => {
    const { value } = req.body;
    const ratingValue = String(value);
    try {
        await kv.hincrby(APP_KEY, `ratings.${ratingValue}`, 1);
        res.status(200).json({ success: true, message: 'Rating saved' });
    } catch (error) {
        console.error('Error saving rating:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = app;