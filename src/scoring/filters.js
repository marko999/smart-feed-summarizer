const fs = require('fs');
const path = require('path');

class ContentFilter {
  constructor() {
    this.topics = this.loadTopics();
    this.minQualityThreshold = 0.3;
    this.minEngagementThreshold = 0.1;
  }

  loadTopics() {
    try {
      const topicsPath = path.join(__dirname, '../../config/topics.json');
      return JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
    } catch (error) {
      console.error('Error loading topics:', error);
      return { exclude_keywords: [] };
    }
  }

  // Main filtering function
  filterItems(items) {
    return items.filter(item => {
      return this.passesBasicFilter(item) &&
             this.passesQualityFilter(item) &&
             this.passesContentFilter(item) &&
             this.passesEngagementFilter(item);
    });
  }

  // Basic filters (required fields, valid URLs, etc.)
  passesBasicFilter(item) {
    // Must have title and URL
    if (!item.title || !item.url) return false;

    // Title must be reasonable length
    if (item.title.length < 5 || item.title.length > 200) return false;

    // URL must be valid
    try {
      new URL(item.url);
    } catch {
      return false;
    }

    // Must have publish date within reasonable range (not future, not too old)
    if (item.publishedAt || item.createdAt) {
      const publishDate = new Date(item.publishedAt || item.createdAt);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      if (publishDate > now || publishDate < oneYearAgo) return false;
    }

    return true;
  }

  // Quality filters (clickbait detection, spam, etc.)
  passesQualityFilter(item) {
    const title = item.title.toLowerCase();
    const description = (item.description || '').toLowerCase();

    // Clickbait patterns
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /amazing/i,
      /incredible/i,
      /must see/i,
      /will blow your mind/i,
      /doctors hate/i,
      /one weird trick/i,
      /[0-9]+ reasons why/i,
      /what happens next/i
    ];

    if (clickbaitPatterns.some(pattern => pattern.test(title))) {
      return false;
    }

    // Excessive punctuation or caps
    if (/[!]{3,}|[?]{3,}/.test(title)) return false;
    if (title.split('').filter(c => c === c.toUpperCase() && c.match(/[A-Z]/)).length > title.length * 0.5) {
      return false;
    }

    // Spam keywords
    const spamKeywords = [
      'free money', 'get rich quick', 'make money fast', 'work from home',
      'lose weight fast', 'miracle cure', 'secret revealed', 'limited time'
    ];

    if (spamKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return false;
    }

    return true;
  }

  // Content filters (excluded topics, inappropriate content)
  passesContentFilter(item) {
    const title = item.title.toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = title + ' ' + description;

    // Check excluded keywords
    const excludeKeywords = this.topics.exclude_keywords || [];
    if (excludeKeywords.some(keyword => content.includes(keyword.toLowerCase()))) {
      return false;
    }

    // Filter out certain content types
    const excludePatterns = [
      /drama/i,
      /controversy/i,
      /scandal/i,
      /gossip/i,
      /celebrity/i,
      /politics/i,
      /religion/i,
      /nsfw/i,
      /adult content/i
    ];

    if (excludePatterns.some(pattern => pattern.test(content))) {
      return false;
    }

    return true;
  }

  // Engagement filters (minimum thresholds)
  passesEngagementFilter(item) {
    if (item.type === 'youtube') {
      // YouTube: minimum views or recent upload
      const views = item.viewCount || 0;
      const publishDate = new Date(item.publishedAt || Date.now());
      const ageInDays = (Date.now() - publishDate) / (1000 * 60 * 60 * 24);

      // Recent videos (< 7 days) get lower threshold
      const minViews = ageInDays < 7 ? 100 : 1000;
      return views >= minViews;
    }

    if (item.type === 'reddit') {
      // Reddit: minimum score and upvote ratio
      const score = item.score || 0;
      const ratio = item.upvoteRatio || 0;

      return score >= 10 && ratio >= 0.6;
    }

    return true;
  }

  // Remove duplicates based on title similarity
  removeDuplicates(items) {
    const seen = new Set();
    const filtered = [];

    for (const item of items) {
      const normalizedTitle = this.normalizeTitle(item.title);
      
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        filtered.push(item);
      }
    }

    return filtered;
  }

  // Normalize title for duplicate detection
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  // Filter by date range
  filterByDateRange(items, daysBack = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return items.filter(item => {
      const publishDate = new Date(item.publishedAt || item.createdAt || Date.now());
      return publishDate >= cutoffDate;
    });
  }

  // Filter by minimum score threshold
  filterByScore(items, minScore = 0.3) {
    return items.filter(item => {
      return !item.scoring || item.scoring.totalScore >= minScore;
    });
  }
}

module.exports = ContentFilter;