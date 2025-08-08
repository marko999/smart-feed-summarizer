const OpenAI = require('openai');

class GeminiAnalyzer {
  constructor() {
    this.defaultTimeout = 60000; // 60 seconds
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async analyzeYouTubeVideo(videoUrl, comments = [], wordCount = 200) {
    console.log('\n🎬 YOUTUBE ANALYZER CALLED:');
    console.log(`   - Video URL: ${videoUrl}`);
    console.log(`   - Comments count: ${comments.length}`);
    console.log(`   - Word count: ${wordCount}`);

    const commentsText = comments.length > 0
      ? comments.map(c => `- ${c.text || c.body || ''} (${c.likes || c.score || 0} votes)`).join('\n')
      : 'No comments available';

    console.log(`   - Comments text length: ${commentsText.length} chars`);

    const prompt = `You are an expert content analyst. Analyze this YouTube content in approximately ${wordCount} words and use the exact headings below.

VIDEO URL: ${videoUrl}

TOP VIEWER COMMENTS:
${commentsText}

Respond in this exact format:
**Summary:** <Inferred content type, key topics, educational value, target audience>
**Audience Reaction:** <Overall sentiment based on comments (positive/negative/mixed) with key themes>`;

    console.log(`   - Final prompt length: ${prompt.length} chars`);
    console.log('   🚀 Calling LLM API...\n');

    return await this.callLLM(prompt);
  }

  async analyzeRedditPost(postData, wordCount = 150) {
    const { title, selftext, subreddit, score, upvoteRatio, comments = [], url } = postData;

    const commentsText = comments.length > 0
      ? comments.map(c => `- ${c.body || c.text || ''} (${c.score || c.likes || 0} votes)`).join('\n')
      : 'No comments available';

    const contentType = url && !url.includes('reddit.com') ? 'LINK POST' : 'TEXT POST';
    const content = selftext || `External link: ${url}`;

    const prompt = `You are an expert discussion analyst. Analyze this Reddit discussion in approximately ${wordCount} words and use the exact headings below.

${contentType}: r/${subreddit}
Title: ${title}
Content: ${content}
Score: ${score} (${upvoteRatio ? Math.round(upvoteRatio * 100) : 'N/A'}% upvoted)

TOP COMMENTS:
${commentsText}

Respond in this exact format:
**Discussion Summary:** <Main points, insights, key arguments>
**Community Sentiment:** <Reception, debates, consensus/disagreement, overall mood>`;

    return await this.callLLM(prompt);
  }

  async callLLM(prompt) {
    console.log('\n⚡ LLM CALL STARTED:');
    console.log(`   - Prompt received: ${prompt ? 'Yes' : 'No'}`);
    console.log(`   - Prompt length: ${prompt ? prompt.length : 0} chars`);

    if (!this.openai) {
      console.warn('   ⚠️ OPENAI_API_KEY not set. Using mock response.');
      return this.getMockResponse(prompt);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a concise, reliable content summarizer. Always follow the requested headings and be factual.'
          },
          { role: 'user', content: prompt }
        ]
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error('Empty response from LLM');
      }

      return this.parseGeminiResponse(text);
    } catch (error) {
      console.error('❌ LLM API error:', error.message);
      return this.getFallbackResponse(error);
    }
  }

  getMockResponse(prompt) {
    // Generate mock responses based on content type
    if (prompt.includes('YouTube') || prompt.includes('TOP VIEWER COMMENTS')) {
      return {
        summary: 'This educational video covers advanced concepts in mathematics and visualization, providing clear explanations with practical examples. The content is well-structured and suitable for intermediate to advanced learners.',
        sentiment: 'Positive - Viewers appreciate the clear explanations and visual approach. Many comments request follow-up videos and praise the teaching methodology.',
        fullResponse: '**Summary:** This educational video covers advanced concepts in mathematics and visualization, providing clear explanations with practical examples. **Audience Reaction:** Positive - Viewers appreciate the clear explanations and visual approach.',
        timestamp: new Date().toISOString(),
        mock: true
      };
    } else if (prompt.includes('Reddit discussion')) {
      return {
        summary: 'Community discussion about emerging technology trends and their practical applications. Members share experiences and debate implementation strategies with generally constructive dialogue.',
        sentiment: 'Mixed but constructive - Strong engagement with diverse viewpoints. Some disagreement on implementation details but overall positive community interaction.',
        fullResponse: '**Discussion Summary:** Community discussion about emerging technology trends and their practical applications. **Community Sentiment:** Mixed but constructive - Strong engagement with diverse viewpoints.',
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
    
    return this.getFallbackResponse(new Error('Unknown content type'));
  }

  parseGeminiResponse(response) {
    // Extract summary and sentiment from formatted response
    const summaryMatch = response.match(/\*\*Summary:\*\*\s*(.*?)(?=\*\*|$)/s);
    const sentimentMatch = response.match(/\*\*(Audience Reaction|Community Sentiment):\*\*\s*(.*?)(?=\*\*|$)/s);
    const discussionMatch = response.match(/\*\*Discussion Summary:\*\*\s*(.*?)(?=\*\*|$)/s);

    return {
      summary: (summaryMatch?.[1] || discussionMatch?.[1] || response).trim(),
      sentiment: sentimentMatch?.[2]?.trim() || 'Unable to analyze sentiment',
      fullResponse: response,
      timestamp: new Date().toISOString()
    };
  }

  getFallbackResponse(error) {
    return {
      summary: 'Unable to generate AI summary due to processing error',
      sentiment: 'Unable to analyze sentiment',
      fullResponse: `Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: true
    };
  }

  async testConnection() {
    try {
      const testPrompt = 'Respond with "Gemini CLI is working" in exactly 5 words.';
      const result = await this.callGeminiCLI(testPrompt);
      return !result.error;
    } catch (error) {
      console.error('Gemini CLI test failed:', error.message);
      return false;
    }
  }
}

module.exports = GeminiAnalyzer;