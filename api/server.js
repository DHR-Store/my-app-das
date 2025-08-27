const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Load environment variables (for production, use Vercel's environment variables)
const MONGODB_URI = process.env.MONGODB_URI || 'YOUR_MONGODB_ATLAS_CONNECTION_STRING';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('Database connection error:', err);
});

// Define the schema for our data
const StatsSchema = new mongoose.Schema({
    _id: String, // Use a fixed ID like 'vega_stats'
    downloads: {
        'arm64-v8a': { type: Number, default: 0 },
        'armeabi-v7a': { type: Number, default: 0 },
        'universal': { type: Number, default: 0 }
    },
    ratings: {
        '5': { type: Number, default: 0 },
        '4': { type: Number, default: 0 },
        '3': { type: Number, default: 0 },
        '2': { type: Number, default: 0 },
        '1': { type: Number, default: 0 }
    }
});

const Stats = mongoose.model('Stats', StatsSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// --- API Endpoints ---

// Endpoint to get all data (downloads and ratings)
app.get('/api/data', async (req, res) => {
    try {
        let stats = await Stats.findById('vega_stats');
        if (!stats) {
            stats = new Stats({ _id: 'vega_stats' });
            await stats.save();
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
});

// Endpoint to track a download
app.post('/api/download', async (req, res) => {
    const { version } = req.body;
    try {
        let stats = await Stats.findById('vega_stats');
        if (!stats) {
             // Create a document if it doesn't exist
            stats = new Stats({ _id: 'vega_stats' });
            await stats.save();
        }

        if (stats.downloads[version] !== undefined) {
            stats.downloads[version]++;
            await stats.save();
            res.status(200).json({ success: true, message: 'Download tracked' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid version' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
});

// Endpoint to save a rating
app.post('/api/rating', async (req, res) => {
    const { value } = req.body;
    const ratingValue = String(value);

    try {
        let stats = await Stats.findById('vega_stats');
        if (!stats) {
            // Create a document if it doesn't exist
            stats = new Stats({ _id: 'vega_stats' });
            await stats.save();
        }

        if (stats.ratings[ratingValue] !== undefined) {
            stats.ratings[ratingValue]++;
            await stats.save();
            res.status(200).json({ success: true, message: 'Rating saved' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid rating value' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
});

// Define the root path for Vercel
module.exports = app;