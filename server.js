const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const YouTubeCollector = require('./src/collectors/youtube');
const RedditCollector = require('./src/collectors/reddit');
const AISummarizer = require('./src/ai/summarizer');
const ContentDistributionAPI = require('./src/api/contentDistribution');
const PreviewModeAPI = require('./src/api/previewMode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize collectors and summarizer
const youtubeCollector = new YouTubeCollector();
const redditCollector = new RedditCollector();
const aiSummarizer = new AISummarizer();
const contentDistributionAPI = new ContentDistributionAPI();
const previewModeAPI = new PreviewModeAPI();

// In-memory storage (in production, use a database)
let summaries = [];
let lastUpdate = null;
let isCollecting = false;
let collectionProgress = {
    currentStep: '',
    totalSteps: 0,
    completedSteps: 0,
    currentFeed: '',
    details: []
};

// Load feed configurations
const feedsConfig = require('./config/feeds.json');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get current summaries
app.get('/api/summaries', (req, res) => {
    res.json({
        summaries,
        lastUpdate,
        totalItems: summaries.length,
        stats: {
            youtube: summaries.filter(s => s.type === 'youtube').length,
            reddit: summaries.filter(s => s.type === 'reddit').length,
            aiSummaries: summaries.filter(s => s.summaryMethod === 'ai').length
        }
    });
});

// Trigger manual collection
app.post('/api/collect', async (req, res) => {
    if (isCollecting) {
        return res.json({ success: false, error: 'Collection already in progress' });
    }

    try {
        const result = await collectAllFeeds();
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Collection error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get collection status
app.get('/api/status', (req, res) => {
    res.json({
        isCollecting,
        lastUpdate,
        totalItems: summaries.length,
        nextUpdate: getNextUpdateTime(),
        progress: isCollecting ? collectionProgress : null
    });
});

// Content distribution endpoints
app.post('/api/content-distribution', async (req, res) => {
    try {
        const { distribution } = req.body;
        
        if (!distribution) {
            return res.status(400).json({ error: 'Distribution settings required' });
        }

        const result = await contentDistributionAPI.updateContentDistribution(distribution);
        
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in content distribution endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/content-distribution', async (req, res) => {
    try {
        const result = await contentDistributionAPI.getCurrentDistribution();
        
        if (result.success) {
            res.json(result.distribution);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error getting content distribution:', error);
        res.status(500).json({ error: error.message });
    }
});

// Preview mode endpoints
app.post('/api/collect-previews', async (req, res) => {
    try {
        console.log('🔍 Starting preview collection...');
        const result = await previewModeAPI.collectPreviews();
        
        if (result.success) {
            res.json({
                success: true,
                previews: result.previews,
                timestamp: result.timestamp,
                stats: result.previews.stats
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error collecting previews:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/summarize-selected', async (req, res) => {
    try {
        const { selectedItems } = req.body;
        
        if (!selectedItems || !Array.isArray(selectedItems)) {
            return res.status(400).json({ error: 'Selected items array required' });
        }

        console.log(`📝 Starting summarization of ${selectedItems.length} selected items...`);
        
        // Update progress
        isCollecting = true;
        collectionProgress = {
            currentStep: 'Summarizing selected content',
            totalSteps: selectedItems.length,
            completedSteps: 0,
            currentFeed: 'Processing selected items...',
            details: []
        };

        const summarizedItems = [];
        
        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            
            try {
                collectionProgress.completedSteps = i;
                collectionProgress.currentFeed = `Summarizing: ${item.title.substring(0, 50)}...`;
                
                console.log(`  • Processing ${i + 1}/${selectedItems.length}: ${item.title.substring(0, 50)}...`);
                
                const summarizedItem = await aiSummarizer.summarizeItem(item);
                summarizedItems.push(summarizedItem);
                
                collectionProgress.details.push(`✅ ${item.title.substring(0, 40)}...`);
                
            } catch (error) {
                console.error(`❌ Error summarizing ${item.title}:`, error);
                collectionProgress.details.push(`❌ Failed: ${item.title.substring(0, 40)}...`);
            }
        }

        collectionProgress.completedSteps = selectedItems.length;
        collectionProgress.currentStep = 'Summarization completed';
        
        // Update global summaries
        summaries = summarizedItems;
        lastUpdate = new Date().toISOString();
        
        const stats = aiSummarizer.getStats(summarizedItems);
        
        console.log(`✅ Summarization completed!`);
        console.log(`   Items processed: ${summarizedItems.length}`);
        console.log(`   Stats:`, stats);
        
        setTimeout(() => {
            isCollecting = false;
            collectionProgress = { currentStep: '', totalSteps: 0, completedSteps: 0, currentFeed: '', details: [] };
        }, 2000);
        
        res.json({
            success: true,
            summaries: summarizedItems,
            stats: stats,
            totalItems: summarizedItems.length,
            lastUpdate: lastUpdate
        });

    } catch (error) {
        console.error('Error summarizing selected items:', error);
        isCollecting = false;
        res.status(500).json({ error: error.message });
    }
});

// Main collection function
async function collectAllFeeds() {
    if (isCollecting) {
        console.log('Collection already in progress, skipping...');
        return;
    }

    isCollecting = true;
    
    // Initialize progress tracking
    const totalFeeds = (feedsConfig.youtube ? feedsConfig.youtube.length : 0) + 
                      (feedsConfig.reddit ? feedsConfig.reddit.length : 0);
    
    collectionProgress = {
        currentStep: 'Starting collection...',
        totalSteps: totalFeeds + 1, // +1 for AI summarization step
        completedSteps: 0,
        currentFeed: '',
        details: []
    };
    
    console.log('\n🚀 Starting feed collection...');
    
    try {
        const allItems = [];
        let totalOriginalItems = 0;

        // Collect YouTube feeds
        if (feedsConfig.youtube && feedsConfig.youtube.length > 0) {
            collectionProgress.currentStep = 'Collecting YouTube feeds';
            console.log('\n📺 Collecting YouTube feeds...');
            
            for (const feedConfig of feedsConfig.youtube) {
                collectionProgress.currentFeed = `📺 ${feedConfig.name}`;
                try {
                    const items = await youtubeCollector.collectFeed(feedConfig);
                    allItems.push(...items);
                    totalOriginalItems += 20;
                    collectionProgress.completedSteps++;
                    collectionProgress.details.push(`✅ ${feedConfig.name}: ${items.length} items`);
                    console.log(`✅ ${feedConfig.name}: ${items.length} items selected`);
                } catch (error) {
                    collectionProgress.details.push(`❌ ${feedConfig.name}: Error`);
                    console.error(`❌ Error collecting ${feedConfig.name}:`, error.message);
                }
            }
        }

        // Collect Reddit feeds
        if (feedsConfig.reddit && feedsConfig.reddit.length > 0) {
            collectionProgress.currentStep = 'Collecting Reddit feeds';
            console.log('\n🔴 Collecting Reddit feeds...');
            
            for (const feedConfig of feedsConfig.reddit) {
                collectionProgress.currentFeed = `🔴 r/${feedConfig.subreddit}`;
                try {
                    const items = await redditCollector.collectFeed(feedConfig);
                    allItems.push(...items);
                    totalOriginalItems += 25;
                    collectionProgress.completedSteps++;
                    collectionProgress.details.push(`✅ r/${feedConfig.subreddit}: ${items.length} items`);
                    console.log(`✅ r/${feedConfig.subreddit}: ${items.length} items selected`);
                } catch (error) {
                    collectionProgress.details.push(`❌ r/${feedConfig.subreddit}: Error`);
                    console.error(`❌ Error collecting r/${feedConfig.subreddit}:`, error.message);
                }
            }
        }

        console.log(`\n📊 Collection Summary:`);
        console.log(`   Total feeds processed: ${totalFeeds}`);
        console.log(`   Original items: ~${totalOriginalItems}`);
        console.log(`   Items after filtering: ${allItems.length}`);

        // Generate summaries
        collectionProgress.currentStep = 'Generating AI summaries';
        collectionProgress.currentFeed = `🤖 Processing ${allItems.length} items`;
        console.log('\n🤖 Generating AI summaries...');
        const summarizedItems = await aiSummarizer.summarizeItems(allItems);
        collectionProgress.completedSteps++;
        
        // Get summarization stats
        const summaryStats = aiSummarizer.getStats(summarizedItems);
        console.log(`\n📝 Summarization Stats:`);
        console.log(`   AI summaries: ${summaryStats.ai}`);
        console.log(`   Extractive summaries: ${summaryStats.extractive}`);
        console.log(`   Errors: ${summaryStats.errors}`);
        console.log(`   Average length: ${summaryStats.avgLength} chars`);

        // Update global summaries
        summaries = summarizedItems;
        lastUpdate = new Date().toISOString();

        collectionProgress.currentStep = 'Collection completed!';
        collectionProgress.currentFeed = `🎉 ${summaries.length} items ready`;

        console.log(`\n✅ Collection completed successfully!`);
        console.log(`   Final items: ${summaries.length}`);
        console.log(`   Next update: ${getNextUpdateTime()}`);

        return {
            totalItems: summaries.length,
            originalItems: totalOriginalItems,
            stats: summaryStats,
            lastUpdate
        };

    } catch (error) {
        console.error('❌ Collection failed:', error);
        collectionProgress.currentStep = 'Collection failed';
        collectionProgress.currentFeed = `❌ ${error.message}`;
        throw error;
    } finally {
        isCollecting = false;
        // Reset progress after a delay
        setTimeout(() => {
            collectionProgress = { currentStep: '', totalSteps: 0, completedSteps: 0, currentFeed: '', details: [] };
        }, 5000);
    }
}

// Get next scheduled update time
function getNextUpdateTime() {
    const schedule = process.env.UPDATE_SCHEDULE || '0 */6 * * *'; // Every 6 hours
    // This is a simplified version - in production, use a proper cron parser
    return 'Next scheduled update in ~6 hours';
}

// Schedule automatic updates
const updateSchedule = process.env.UPDATE_SCHEDULE || '0 */6 * * *'; // Every 6 hours
cron.schedule(updateSchedule, async () => {
    console.log('\n⏰ Scheduled collection starting...');
    try {
        await collectAllFeeds();
    } catch (error) {
        console.error('Scheduled collection failed:', error);
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🧠 Smart Feed Summarizer`);
    console.log(`🌐 Server running on http://localhost:${PORT}`);
    console.log(`📅 Update schedule: ${updateSchedule}`);
    console.log(`🔑 AI summarization: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled'}`);
    console.log(`\n💡 Ready to collect! Click "Refresh Feeds" in the dashboard to start.`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
});