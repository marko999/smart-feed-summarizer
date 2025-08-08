const axios = require('axios');
const WeightingEngine = require('../scoring/weights');
const ContentFilter = require('../scoring/filters');

class BaseCollector {
  constructor() {
    this.weightingEngine = new WeightingEngine();
    this.contentFilter = new ContentFilter();
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  // Abstract method - must be implemented by subclasses
  async collectFeed(feedConfig) {
    throw new Error('collectFeed method must be implemented by subclass');
  }

  // Common HTTP request method
  async makeRequest(url, options = {}) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          ...options.headers
        },
        timeout: 10000,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`Request failed for ${url}:`, error.message);
      throw error;
    }
  }

  // Process collected items through filtering and scoring
  async processItems(items, feedConfig, limit = 3) {
    console.log(`Processing ${items.length} items from ${feedConfig.name || 'feed'}`);

    // Step 1: Basic filtering
    const filtered = this.contentFilter.filterItems(items);
    console.log(`After filtering: ${filtered.length} items`);

    // Step 2: Remove duplicates
    const deduplicated = this.contentFilter.removeDuplicates(filtered);
    console.log(`After deduplication: ${deduplicated.length} items`);

    // Step 3: Score and select top items
    const topItems = this.weightingEngine.selectTopItems(deduplicated, feedConfig, limit);
    console.log(`Selected top ${topItems.length} items`);

    return topItems;
  }

  // Extract text content from HTML
  extractTextContent(html) {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Parse date string to ISO format
  parseDate(dateString) {
    try {
      return new Date(dateString).toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateString);
      return new Date().toISOString();
    }
  }

  // Validate required fields
  validateItem(item, requiredFields = ['title', 'url']) {
    for (const field of requiredFields) {
      if (!item[field]) {
        console.warn(`Missing required field '${field}' in item:`, item);
        return false;
      }
    }
    return true;
  }

  // Log collection statistics
  logStats(feedName, originalCount, processedCount, selectedCount) {
    console.log(`\n📊 Collection Stats for ${feedName}:`);
    console.log(`   Original items: ${originalCount}`);
    console.log(`   After processing: ${processedCount}`);
    console.log(`   Selected: ${selectedCount}`);
    console.log(`   Selection rate: ${((selectedCount / originalCount) * 100).toFixed(1)}%`);
  }
}

module.exports = BaseCollector;