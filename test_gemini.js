const GeminiAnalyzer = require('./src/ai/gemini');

async function testGemini() {
    console.log('🧪 Testing Gemini Integration...\n');
    
    const gemini = new GeminiAnalyzer();
    
    // Test connection
    console.log('1. Testing connection...');
    const isConnected = await gemini.testConnection();
    console.log(`   Connection: ${isConnected ? '✅ Working' : '❌ Failed'}\n`);
    
    // Test YouTube analysis
    console.log('2. Testing YouTube video analysis...');
    try {
        const youtubeResult = await gemini.analyzeYouTubeVideo(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            [
                { text: 'Great song! Never gets old.', likes: 150 },
                { text: 'Classic rickroll material 😄', likes: 89 }
            ],
            100
        );
        
        console.log('   YouTube Analysis Result:');
        console.log(`   Summary: ${youtubeResult.summary}`);
        console.log(`   Sentiment: ${youtubeResult.sentiment}`);
        console.log(`   Mock: ${youtubeResult.mock ? 'Yes' : 'No'}\n`);
    } catch (error) {
        console.log(`   ❌ YouTube analysis failed: ${error.message}\n`);
    }
    
    // Test Reddit analysis
    console.log('3. Testing Reddit post analysis...');
    try {
        const redditResult = await gemini.analyzeRedditPost({
            title: 'New AI breakthrough in machine learning',
            selftext: 'Researchers have developed a new approach to neural networks...',
            subreddit: 'MachineLearning',
            score: 1250,
            upvoteRatio: 0.95,
            comments: [
                { body: 'This is fascinating! Great work by the researchers.', score: 45 },
                { body: 'I wonder how this compares to existing methods.', score: 23 }
            ]
        }, 80);
        
        console.log('   Reddit Analysis Result:');
        console.log(`   Summary: ${redditResult.summary}`);
        console.log(`   Sentiment: ${redditResult.sentiment}`);
        console.log(`   Mock: ${redditResult.mock ? 'Yes' : 'No'}\n`);
    } catch (error) {
        console.log(`   ❌ Reddit analysis failed: ${error.message}\n`);
    }
    
    console.log('🎉 Gemini integration test completed!');
}

testGemini().catch(console.error);