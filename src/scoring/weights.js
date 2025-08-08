const fs = require('fs');
const path = require('path');

class WeightingEngine {
  constructor() {
    this.topics = this.loadTopics();
    this.weights = {
      engagement: parseFloat(process.env.WEIGHT_ENGAGEMENT) || 0.3,
      recency: parseFloat(process.env.WEIGHT_RECENCY) || 0.25,
      topicMatch: parseFloat(process.env.WEIGHT_TOPIC_MATCH) || 0.25,
      quality: parseFloat(process.env.WEIGHT_QUALITY) || 0.15,
      source: parseFloat(process.env.WEIGHT_SOURCE) || 0.05
    };
  }

  loadTopics() {
    try {
      const topicsPath = path.join(__dirname, '../../config/topics.json');
      return JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
    } catch (error) {
      console.error('Error loading topics:', error);
      return { interests: [], keywords: {}, exclude_keywords: [] };
    }
  }

  // Main scoring function
  calculateScore(item, feedConfig) {
    const scores = {
      engagement: this.calculateEngagementScore(item),
      recency: this.calculateRecencyScore(item),
      topicMatch: this.calculateTopicScore(item, feedConfig.topics),
      quality: this.calculateQualityScore(item),
      source: feedConfig.weight || 1.0
    };

    // Calculate weighted total
    const totalScore = Object.keys(scores).reduce((total, key) => {
      return total + (scores[key] * this.weights[key]);
    }, 0);

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown: scores,
      weights: this.weights
    };
  }

  // Calculate engagement score (0-1)
  calculateEngagementScore(item) {
    let score = 0;

    if (item.type === 'youtube') {
      // YouTube engagement: views, likes, comments
      const views = item.viewCount || 0;
      const likes = item.likeCount || 0;
      const comments = item.commentCount || 0;

      // Normalize based on typical ranges
      const viewScore = Math.min(views / 100000, 1); // 100k views = max
      const likeScore = Math.min(likes / 1000, 1);   // 1k likes = max
      const commentScore = Math.min(comments / 100, 1); // 100 comments = max

      score = (viewScore * 0.5) + (likeScore * 0.3) + (commentScore * 0.2);
    } else if (item.type === 'reddit') {
      // Reddit engagement: upvotes, comments, upvote ratio
      const upvotes = item.score || 0;
      const comments = item.commentCount || 0;
      const ratio = item.upvoteRatio || 0.5;

      const upvoteScore = Math.min(upvotes / 1000, 1); // 1k upvotes = max
      const commentScore = Math.min(comments / 50, 1); // 50 comments = max
      const ratioScore = ratio; // Already 0-1

      score = (upvoteScore * 0.5) + (commentScore * 0.3) + (ratioScore * 0.2);
    }

    return Math.min(Math.max(score, 0), 1);
  }

  // Calculate recency score (0-1, newer = higher)
  calculateRecencyScore(item) {
    const now = new Date();
    const publishDate = new Date(item.publishedAt || item.createdAt || now);
    const ageInHours = (now - publishDate) / (1000 * 60 * 60);

    // Score decreases over time
    // 0-6 hours: 1.0
    // 6-24 hours: 0.8
    // 1-7 days: 0.6
    // 1-4 weeks: 0.4
    // 1+ months: 0.2

    if (ageInHours <= 6) return 1.0;
    if (ageInHours <= 24) return 0.8;
    if (ageInHours <= 168) return 0.6; // 7 days
    if (ageInHours <= 672) return 0.4; // 4 weeks
    return 0.2;
  }

  // Calculate topic relevance score (0-1)
  calculateTopicScore(item, feedTopics) {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = title + ' ' + description;

    let score = 0;
    let matches = 0;

    // Check high priority keywords
    const highPriorityMatches = this.countKeywordMatches(content, this.topics.keywords.high_priority || []);
    score += highPriorityMatches * 0.4;
    matches += highPriorityMatches;

    // Check medium priority keywords
    const mediumPriorityMatches = this.countKeywordMatches(content, this.topics.keywords.medium_priority || []);
    score += mediumPriorityMatches * 0.2;
    matches += mediumPriorityMatches;

    // Check feed-specific topics
    const feedTopicMatches = this.countKeywordMatches(content, feedTopics || []);
    score += feedTopicMatches * 0.3;
    matches += feedTopicMatches;

    // Check general interests
    const interestMatches = this.countKeywordMatches(content, this.topics.interests || []);
    score += interestMatches * 0.1;
    matches += interestMatches;

    // Penalty for excluded keywords
    const excludeMatches = this.countKeywordMatches(content, this.topics.exclude_keywords || []);
    score -= excludeMatches * 0.5;

    // Normalize score
    const normalizedScore = matches > 0 ? Math.min(score / matches, 1) : 0;
    return Math.max(normalizedScore, 0);
  }

  // Calculate content quality score (0-1)
  calculateQualityScore(item) {
    let score = 0.5; // Base score

    // Title quality
    const title = item.title || '';
    if (title.length > 10 && title.length < 100) score += 0.1;
    if (!/[!]{2,}|[?]{2,}|CAPS{3,}/.test(title)) score += 0.1; // Not clickbait-y

    // Description quality
    const description = item.description || '';
    if (description.length > 50) score += 0.1;
    if (description.length > 200) score += 0.1;

    // Duration quality (for YouTube)
    if (item.type === 'youtube' && item.duration) {
      const duration = this.parseDuration(item.duration);
      if (duration > 300 && duration < 3600) score += 0.1; // 5-60 minutes is good
    }

    // Engagement quality
    if (item.type === 'reddit') {
      const ratio = item.upvoteRatio || 0.5;
      if (ratio > 0.8) score += 0.1; // High upvote ratio
    }

    return Math.min(Math.max(score, 0), 1);
  }

  // Helper: Count keyword matches
  countKeywordMatches(content, keywords) {
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  // Helper: Parse YouTube duration (PT4M13S -> seconds)
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Select top N items from a list based on scores
  selectTopItems(items, feedConfig, limit = 3) {
    const scoredItems = items.map(item => {
      const scoring = this.calculateScore(item, feedConfig);
      return {
        ...item,
        scoring
      };
    });

    // Sort by total score (descending)
    scoredItems.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);

    return scoredItems.slice(0, limit);
  }
}

module.exports = WeightingEngine;