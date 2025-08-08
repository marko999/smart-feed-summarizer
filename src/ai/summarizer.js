const OpenAI = require('openai');

class AISummarizer {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.maxSummaryLength = parseInt(process.env.SUMMARY_MAX_LENGTH) || 300;
    this.maxContentLength = parseInt(process.env.CONTENT_MAX_LENGTH) || 4000;
  }

  async summarizeItem(item) {
    try {
      console.log(`🤖 Summarizing: ${item.title.substring(0, 50)}...`);
      
      // Use Gemini analysis if available (for YouTube and Reddit)
      if (item.aiSummary && item.aiSummary !== 'AI summary not available') {
        const geminiSummary = this.formatGeminiSummary(item);
        return {
          ...item,
          summary: geminiSummary,
          summaryMethod: 'gemini',
          summaryLength: geminiSummary.length
        };
      }
      
      // Prepare content for summarization
      const content = this.prepareContent(item);
      
      // Try AI summarization first
      if (this.openai && content.length > 100) {
        try {
          const aiSummary = await this.generateAISummary(item, content);
          if (aiSummary) {
            return {
              ...item,
              summary: aiSummary,
              summaryMethod: 'ai',
              summaryLength: aiSummary.length
            };
          }
        } catch (error) {
          console.error('AI summarization failed, falling back to extractive:', error.message);
        }
      }
      
      // Fallback to extractive summarization
      const extractiveSummary = this.generateExtractiveSummary(content, item.type);
      
      return {
        ...item,
        summary: extractiveSummary,
        summaryMethod: 'extractive',
        summaryLength: extractiveSummary.length
      };
      
    } catch (error) {
      console.error(`Error summarizing ${item.title}:`, error);
      return {
        ...item,
        summary: 'Summary generation failed',
        summaryMethod: 'error',
        summaryLength: 0
      };
    }
  }

  formatGeminiSummary(item) {
    // Combine Gemini AI summary with sentiment analysis for a comprehensive summary
    let summary = item.aiSummary;
    
    // Add sentiment/reaction if available and different from default
    const sentiment = item.audienceReaction || item.communitySentiment;
    if (sentiment && 
        sentiment !== 'Sentiment analysis not available' &&
        sentiment !== 'Unable to analyze sentiment') {
      summary += ` ${sentiment}`;
    }
    
    // Ensure summary isn't too long
    if (summary.length > this.maxSummaryLength) {
      summary = summary.substring(0, this.maxSummaryLength - 3) + '...';
    }
    
    return summary;
  }

  async generateAISummary(item, content) {
    const prompt = this.buildPrompt(item, content);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content summarizer. Create concise, informative summaries that capture the key points and value of the content. Focus on what makes this content interesting and worth reading/watching.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.ceil(this.maxSummaryLength / 3), // Rough token estimate
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });
      
      const summary = response.choices[0].message.content.trim();
      
      // Ensure summary isn't too long
      return summary.length > this.maxSummaryLength 
        ? summary.substring(0, this.maxSummaryLength - 3) + '...'
        : summary;
        
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  buildPrompt(item, content) {
    const contentType = item.type === 'youtube' ? 'video' : 'post';
    const source = item.type === 'youtube' ? item.channelName : `r/${item.subreddit}`;
    
    let prompt = `Summarize this ${contentType} from ${source} in 2-3 sentences:\n\n`;
    prompt += `Title: ${item.title}\n\n`;
    
    if (item.description) {
      prompt += `Description: ${item.description}\n\n`;
    }
    
    if (content && content.length > 50) {
      prompt += `Content: ${content}\n\n`;
    }
    
    // Add context based on type
    if (item.type === 'youtube') {
      prompt += `Focus on: What is this video about? What will viewers learn or gain from watching it?\n`;
    } else if (item.type === 'reddit') {
      prompt += `Focus on: What is being discussed? What are the key points or insights?\n`;
    }
    
    prompt += `\nProvide a concise summary that explains why this content is interesting and valuable.`;
    
    return prompt;
  }

  generateExtractiveSummary(content, type) {
    if (!content || content.length < 50) {
      return 'Content too short to summarize effectively.';
    }
    
    // Clean and prepare content
    const cleanContent = this.cleanContent(content);
    
    // Split into sentences
    const sentences = this.splitIntoSentences(cleanContent);
    
    if (sentences.length === 0) {
      return 'No meaningful content found for summarization.';
    }
    
    // Score sentences
    const scoredSentences = this.scoreSentences(sentences, type);
    
    // Select top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index) // Restore original order
      .map(s => s.sentence);
    
    let summary = topSentences.join(' ');
    
    // Ensure summary isn't too long
    if (summary.length > this.maxSummaryLength) {
      summary = summary.substring(0, this.maxSummaryLength - 3) + '...';
    }
    
    return summary || 'Unable to generate meaningful summary.';
  }

  cleanContent(content) {
    return content
      .replace(/\[.*?\]/g, '') // Remove [brackets]
      .replace(/\(.*?\)/g, '') // Remove (parentheses) 
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  splitIntoSentences(content) {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200) // Reasonable sentence length
      .filter(s => !this.isLowQualitySentence(s));
  }

  isLowQualitySentence(sentence) {
    const lowQualityPatterns = [
      /^(um|uh|like|you know)/i,
      /^(thanks|thank you)/i,
      /^(subscribe|like|comment)/i,
      /^(edit|update):/i,
      /^\d+\./  // Numbered lists
    ];
    
    return lowQualityPatterns.some(pattern => pattern.test(sentence));
  }

  scoreSentences(sentences, type) {
    const keywords = this.getRelevantKeywords(type);
    
    return sentences.map((sentence, index) => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // Position score (earlier sentences often more important)
      score += Math.max(0, 1 - (index / sentences.length)) * 0.3;
      
      // Length score (prefer medium-length sentences)
      const idealLength = 80;
      const lengthScore = 1 - Math.abs(sentence.length - idealLength) / idealLength;
      score += Math.max(0, lengthScore) * 0.2;
      
      // Keyword score
      let keywordScore = 0;
      keywords.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          keywordScore += 0.1;
        }
      });
      score += Math.min(keywordScore, 0.5);
      
      // Avoid questions and incomplete thoughts
      if (sentence.endsWith('?')) score -= 0.1;
      if (sentence.length < 30) score -= 0.2;
      
      return {
        sentence,
        score,
        index
      };
    });
  }

  getRelevantKeywords(type) {
    const commonKeywords = [
      'research', 'study', 'analysis', 'data', 'results', 'findings',
      'important', 'significant', 'key', 'main', 'primary', 'major',
      'new', 'innovative', 'breakthrough', 'discovery', 'development'
    ];
    
    if (type === 'youtube') {
      return [...commonKeywords, 'explains', 'shows', 'demonstrates', 'teaches', 'covers'];
    } else if (type === 'reddit') {
      return [...commonKeywords, 'discusses', 'argues', 'points out', 'suggests', 'claims'];
    }
    
    return commonKeywords;
  }

  prepareContent(item) {
    let content = '';
    
    // Add description
    if (item.description) {
      content += item.description + ' ';
    }
    
    // Add transcript for YouTube
    if (item.type === 'youtube' && item.transcript) {
      content += item.transcript + ' ';
    }
    
    // Add post content for Reddit
    if (item.type === 'reddit' && item.content) {
      content += item.content + ' ';
    }
    
    // Limit content length
    return content.substring(0, this.maxContentLength);
  }

  // Batch summarization for efficiency
  async summarizeItems(items) {
    const summaries = [];
    
    for (const item of items) {
      try {
        const summarizedItem = await this.summarizeItem(item);
        summaries.push(summarizedItem);
        
        // Small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        console.error(`Error in batch summarization for ${item.title}:`, error);
        summaries.push({
          ...item,
          summary: 'Summarization failed',
          summaryMethod: 'error'
        });
      }
    }
    
    return summaries;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get summarization statistics
  getStats(summarizedItems) {
    const stats = {
      total: summarizedItems.length,
      gemini: 0,
      ai: 0,
      extractive: 0,
      errors: 0,
      avgLength: 0
    };
    
    let totalLength = 0;
    
    summarizedItems.forEach(item => {
      if (item.summaryMethod === 'gemini') stats.gemini++;
      else if (item.summaryMethod === 'ai') stats.ai++;
      else if (item.summaryMethod === 'extractive') stats.extractive++;
      else stats.errors++;
      
      totalLength += item.summaryLength || 0;
    });
    
    stats.avgLength = Math.round(totalLength / summarizedItems.length);
    
    return stats;
  }
}

module.exports = AISummarizer;