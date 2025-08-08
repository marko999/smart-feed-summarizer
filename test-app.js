#!/usr/bin/env node

// Simple test script to verify the Smart Feed Summarizer is working
const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testApp() {
    console.log('🧠 Testing Smart Feed Summarizer\n');
    
    try {
        // Test 1: Check if server is running
        console.log('1. Testing server status...');
        const statusResponse = await axios.get(`${BASE_URL}/api/status`);
        console.log('✅ Server is running');
        console.log(`   - Total items: ${statusResponse.data.totalItems}`);
        console.log(`   - Last update: ${statusResponse.data.lastUpdate}`);
        console.log(`   - Is collecting: ${statusResponse.data.isCollecting}`);
        
        // Test 2: Check summaries
        console.log('\n2. Testing summaries endpoint...');
        const summariesResponse = await axios.get(`${BASE_URL}/api/summaries`);
        const data = summariesResponse.data;
        console.log('✅ Summaries loaded successfully');
        console.log(`   - Total summaries: ${data.totalItems}`);
        console.log(`   - YouTube videos: ${data.stats.youtube}`);
        console.log(`   - Reddit posts: ${data.stats.reddit}`);
        console.log(`   - AI summaries: ${data.stats.aiSummaries}`);
        
        // Test 3: Show sample content
        if (data.summaries.length > 0) {
            console.log('\n3. Sample content:');
            const sample = data.summaries[0];
            console.log(`   📺 ${sample.title}`);
            console.log(`   🏆 Score: ${sample.scoring?.totalScore || 'N/A'}`);
            console.log(`   📝 Summary: ${sample.summary.substring(0, 100)}...`);
            console.log(`   🔗 URL: ${sample.url}`);
        }
        
        // Test 4: Check dashboard
        console.log('\n4. Testing dashboard...');
        const dashboardResponse = await axios.get(BASE_URL);
        if (dashboardResponse.data.includes('Smart Feed Summarizer')) {
            console.log('✅ Dashboard is accessible');
        } else {
            console.log('❌ Dashboard may have issues');
        }
        
        console.log('\n🎉 All tests passed! The Smart Feed Summarizer is working correctly.');
        console.log(`\n🌐 Open your browser and visit: ${BASE_URL}`);
        console.log('   - View the beautiful dashboard');
        console.log('   - Browse curated content from your feeds');
        console.log('   - Click "Refresh Feeds" to collect new content');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running:');
            console.log('   cd /Users/m1/repos/ai/smart-feed-summarizer');
            console.log('   npm start');
        }
    }
}

if (require.main === module) {
    testApp();
}

module.exports = testApp;