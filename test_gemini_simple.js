const GeminiAnalyzer = require('./src/ai/gemini');

async function testGeminiSimple() {
    console.log('🧪 Testing Gemini with Simple Prompts...\n');
    
    const gemini = new GeminiAnalyzer();
    
    // Test simple prompt
    console.log('1. Testing simple prompt...');
    try {
        const result = await gemini.callGeminiCLI('Respond with exactly 5 words: Hello world test');
        console.log(`   Result: ${result.summary || result.fullResponse}`);
        console.log(`   Mock: ${result.mock ? 'Yes' : 'No'}\n`);
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
    }
    
    // Test multiline prompt
    console.log('2. Testing multiline prompt...');
    try {
        const multilinePrompt = `This is a multiline prompt.
        
Please analyze this content:
- Topic: AI and Machine Learning
- Content: Discussion about neural networks
- Community: Very positive feedback

Respond with exactly 20 words summarizing the discussion.`;
        
        const result = await gemini.callGeminiCLI(multilinePrompt);
        console.log(`   Result: ${result.summary || result.fullResponse}`);
        console.log(`   Mock: ${result.mock ? 'Yes' : 'No'}\n`);
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
    }
    
    console.log('🎉 Test completed!');
}

testGeminiSimple().catch(console.error);