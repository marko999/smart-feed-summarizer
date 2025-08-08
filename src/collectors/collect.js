#!/usr/bin/env node

// Standalone collection script for testing and manual runs
const YouTubeCollector = require('./youtube');
const RedditCollector = require('./reddit');
const AISummarizer = require('../ai/summarizer');
require('dotenv').config();

async function main() {
    console.log('🧠 Smart Feed Summarizer - Collection Test\n');
    
    const youtubeCollector = new YouTubeCollector();
    const redditCollector = new RedditCollector();
    const aiSummarizer = new AISummarizer();
    
    // Load configurations
    const feedsConfig = require('../../config/feeds.json');
    
    try {
        const allItems = [];
        
        // Test YouTube collection
        console.log('📺 Testing YouTube collection...');
        const youtubeFeeds = feedsConfig.youtube.slice(0, 2); // Test first 2 feeds
        for (const feedConfig of youtubeFeeds) {
            console.log(`\nCollecting: ${feedConfig.name}`);
            const items = await youtubeCollector.collectFeed(feedConfig);
            allItems.push(...items);
            
            if (items.length > 0) {
                console.log(`Sample item: ${items[0].title}`);
                console.log(`Score: ${items[0].scoring?.totalScore || 'N/A'}`);
            }
        }
        
        // Test Reddit collection
        console.log('\n🔴 Testing Reddit collection...');
        const redditFeeds = feedsConfig.reddit.slice(0, 2); // Test first 2 feeds
        for (const feedConfig of redditFeeds) {
            console.log(`\nCollecting: r/${feedConfig.subreddit}`);
            const items = await redditCollector.collectFeed(feedConfig);
            allItems.push(...items);
            
            if (items.length > 0) {
                console.log(`Sample item: ${items[0].title}`);
                console.log(`Score: ${items[0].scoring?.totalScore || 'N/A'}`);
            }
        }
        
        console.log(`\n📊 Total items collected: ${allItems.length}`);
        
        // Test summarization
        if (allItems.length > 0) {
            console.log('\n🤖 Testing summarization...');
            const testItem = allItems[0];
            const summarized = await aiSummarizer.summarizeItem(testItem);
            
            console.log(`\nSample Summary:`);
            console.log(`Title: ${summarized.title}`);
            console.log(`Method: ${summarized.summaryMethod}`);
            console.log(`Summary: ${summarized.summary}`);
        }
        
        console.log('\n✅ Collection test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Collection test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;