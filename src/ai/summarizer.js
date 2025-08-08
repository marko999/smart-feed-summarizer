const OpenAI = require('openai');

class AISummarizer {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.maxSummaryLength = parseInt(process.env.SUMMARY_MAX_LENGTH) || 300;
    this.maxContentLength = parseInt(process.env.CONTENT_MAX_LENGTH) || 4000;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async summarizeItem(item) {
    try {
      console.log(`🤖 Summarizing: ${item.title.substring(0, 50)}...`);
      console.log(`   - Type: ${item.type}`);
      console.log(`   - URL: ${item.url || item.link || ''}`);
      
      if (!this.openai) {
        console.log(`   ❌ OPENAI_API_KEY not set`);
        return {
          ...item,
          summary: 'AI summary not available (no API key configured).',
          summaryMethod: 'unavailable',
          summaryLength: 0
        };
      }
      
      console.log(`   🔄 Calling OpenAI to summarize via URL/context...`);
      const summary = await this.generateAISummary(item);
      const finalSummary = summary.length > this.maxSummaryLength
        ? summary.substring(0, this.maxSummaryLength - 3) + '...'
        : summary;
      
      return {
        ...item,
        summary: finalSummary,
        summaryMethod: 'ai',
        summaryLength: finalSummary.length
      };
    } catch (error) {
      console.error(`❌ Error summarizing ${item.title}:`, error);
      console.error(`   - Error type: ${error.constructor.name}`);
      console.error(`   - Error message: ${error.message}`);
      console.error(`   - Stack trace:`, error.stack);
      return {
        ...item,
        summary: 'Summary generation failed',
        summaryMethod: 'error',
        summaryLength: 0
      };
    }
  }

  // Removed Gemini formatting path; summaries are always generated via OpenAI when configured.

  async generateAISummary(item) {
    try {
      const url = item.url || item.link || '';
      const contentContext = this.buildContextForItem(item);
      const targetWords = Math.max(120, Math.min(220, Math.round(this.maxSummaryLength / 1.5)));

      const userPrompt = `Summarize the content at the following URL using the provided context. If the URL cannot be fetched, infer from title and context. Keep it focused, factual, and helpful for a newsletter digest. Aim for about ${targetWords} words. End with one short takeaway.

URL: ${url}
Title: ${item.title}

Context (may include description, tags, or top comments):
${contentContext}

Respond with just the summary text.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You are an expert newsletter editor. Be concise, concrete, and faithful to the source.'
          },
          { role: 'user', content: userPrompt }
        ]
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('Empty AI summary');
      return text;
    } catch (error) {
      console.error('❌ OpenAI summarize error:', error.message);
      return 'Summary unavailable due to AI service error.';
    }
  }

  buildContextForItem(item) {
    try {
      const parts = [];
      if (item.description) parts.push(this.limitText(this.normalizeWhitespace(item.description), this.maxContentLength / 3));
      if (Array.isArray(item.tags) && item.tags.length > 0) parts.push(`Tags: ${item.tags.slice(0, 10).join(', ')}`);
      if (Array.isArray(item.comments) && item.comments.length > 0) {
        const formatted = item.comments
          .slice(0, 5)
          .map(c => `- ${(c.text || c.body || '').toString().slice(0, 180)} (${c.likes || c.score || 0} votes)`) 
          .join('\n');
        parts.push(`Top comments:\n${formatted}`);
      }
      return parts.join('\n\n');
    } catch {
      return '';
    }
  }

  limitText(text, max) {
    if (!text) return '';
    const clean = this.normalizeWhitespace(text);
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
  }

  normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }


  // Batch summarization for efficiency
  async summarizeItems(items) {
    console.log(`\n🔄 Starting batch summarization of ${items.length} items...`);
    const summaries = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        console.log(`\n📋 Processing item ${i + 1}/${items.length}:`);
        console.log(`   - Title: ${item.title}`);
        console.log(`   - Type: ${item.type}`);
        console.log(`   - URL: ${item.url}`);
        
        const summarizedItem = await this.summarizeItem(item);
        summaries.push(summarizedItem);
        
        console.log(`   ✅ Item ${i + 1} completed with method: ${summarizedItem.summaryMethod}`);
        
        // Small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        console.error(`❌ Error in batch summarization for ${item.title}:`, error);
        console.error(`   - Batch item ${i + 1}/${items.length}`);
        console.error(`   - Error details:`, error.stack);
        summaries.push({
          ...item,
          summary: 'Summarization failed',
          summaryMethod: 'error'
        });
      }
    }
    
    console.log(`\n✅ Batch summarization completed. ${summaries.length} items processed.`);
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