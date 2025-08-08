const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const execAsync = promisify(exec);

class GeminiAnalyzer {
  constructor() {
    this.defaultTimeout = 60000; // 60 seconds
  }

  async analyzeYouTubeVideo(videoUrl, comments = [], wordCount = 200) {
    const commentsText = comments.length > 0 
      ? comments.map(c => `- ${c.text} (${c.likes || 0} likes)`).join('\n')
      : 'No comments available';

    const prompt = `Analyze this YouTube content in exactly ${wordCount} words:

VIDEO URL: ${videoUrl}
(Note: Focus on analyzing the comments and inferring content type from URL patterns)

TOP VIEWER COMMENTS:
${commentsText}

Based on the comments and URL context, provide analysis in this format:
**Summary:** [Inferred content type, likely topics, educational value, target audience]
**Audience Reaction:** [Overall sentiment from comments - positive/negative/mixed with key themes]

Focus on what the comments reveal about the content and community reception.`;

    return await this.callGeminiCLI(prompt);
  }

  async analyzeRedditPost(postData, wordCount = 150) {
    const { title, selftext, subreddit, score, upvoteRatio, comments = [], url } = postData;
    
    const commentsText = comments.length > 0
      ? comments.map(c => `- ${c.body} (${c.score} points)`).join('\n')
      : 'No comments available';

    const contentType = url && !url.includes('reddit.com') ? 'LINK POST' : 'TEXT POST';
    const content = selftext || `External link: ${url}`;

    const prompt = `Analyze this Reddit discussion in exactly ${wordCount} words:

${contentType}: r/${subreddit}
Title: ${title}
Content: ${content}
Score: ${score} (${upvoteRatio ? Math.round(upvoteRatio * 100) : 'N/A'}% upvoted)

TOP COMMENTS:
${commentsText}

Provide analysis in this format:
**Discussion Summary:** [Main points, insights, key arguments]
**Community Sentiment:** [Reception, debates, consensus/disagreement, overall mood]

Focus on the discussion dynamics and community insights.`;

    return await this.callGeminiCLI(prompt);
  }

  async callGeminiCLI(prompt) {
    let tempFile = null;
    
    try {
      // Check if gemini is available
      const testCommand = 'which gemini';
      await execAsync(testCommand);
      
      // Create temporary file for the prompt to avoid shell escaping issues
      tempFile = path.join(os.tmpdir(), `gemini_prompt_${Date.now()}.txt`);
      await fs.writeFile(tempFile, prompt, 'utf8');
      
      // Use cat to pipe the file content to gemini
      const command = `cat "${tempFile}" | gemini`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.defaultTimeout,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && !stderr.includes('Warning') && !stderr.includes('failed to start or connect to MCP')) {
        console.warn('Gemini CLI warning:', stderr);
      }

      return this.parseGeminiResponse(stdout.trim());
    } catch (error) {
      console.error('Gemini CLI error:', error.message);
      
      // Return mock response for testing when gemini is not available
      if (error.message.includes('gemini') || error.code === 'ENOENT') {
        return this.getMockResponse(prompt);
      }
      
      return this.getFallbackResponse(error);
    } finally {
      // Clean up temporary file
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      }
    }
  }

  getMockResponse(prompt) {
    // Generate mock responses based on content type
    if (prompt.includes('YouTube video')) {
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