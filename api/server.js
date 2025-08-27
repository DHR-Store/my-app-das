const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@vercel/kv'); // Import the Vercel KV client

const app = express();
const PORT = 3000;

// Initialize the Vercel KV client using the new environment variables
const kv = createClient({
    url: process.env.KV_URL, // New Vercel variable for the KV URL
    token: process.env.BLOB_READ_WRITE_TOKEN, // New Vercel variable for the write token
});

const APP_KEY = 'vega_app_stats'; // A single key to hold all app data

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Helper function to fetch and initialize data from the KV store
const getStats = async () => {
    try {
        let stats = await kv.hgetall(APP_KEY);
        if (!stats || Object.keys(stats).length === 0) {
            // Initialize with default values if no data exists
            stats = {
                downloads: {
                    'arm64-v8a': 0,
                    'armeabi-v7a': 0,
                    'universal': 0
                },
                ratings: {
                    '5': 590, // Initial ratings, you can adjust
                    '4': 0,
                    '3': 0,
                    '2': 0,
                    '1': 0
                }
            };
            // Save the initial data to Vercel KV
            await kv.hset(APP_KEY, stats);
        }
        return stats;
    } catch (error) {
        console.error('Error fetching data from Vercel KV:', error);
        // Fallback to initial data if the connection fails
        return {
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
    }
};

// --- API Endpoints ---

// Endpoint to get all data (downloads and ratings)
app.get('/api/data', async (req, res) => {
    const data = await getStats();
    res.json(data);
});

// Endpoint to track a download
app.post('/api/download', async (req, res) => {
    const { version } = req.body;
    if (version) {
        try {
            // Increment the specific download counter in Vercel KV
            await kv.hincrby(APP_KEY, `downloads.${version}`, 1);
            res.status(200).json({ success: true, message: `Download for ${version} tracked` });
        } catch (error) {
            console.error('Error tracking download:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid version' });
    }
});

// Endpoint to save a rating
app.post('/api/rating', async (req, res) => {
    const { value } = req.body;
    const ratingValue = String(value);
    if (ratingValue) {
        try {
            // Increment the specific rating counter in Vercel KV
            await kv.hincrby(APP_KEY, `ratings.${ratingValue}`, 1);
            res.status(200).json({ success: true, message: 'Rating saved' });
        } catch (error) {
            console.error('Error saving rating:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid rating value' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for Vercel's serverless functions
module.exports = app;
