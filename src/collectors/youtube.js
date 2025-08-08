const BaseCollector = require('./base');
const Parser = require('rss-parser');
// Using feeds.json now instead of sources.json

class YouTubeCollector extends BaseCollector {
  constructor() {
    super();
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:group', 'mediaGroup'],
          ['yt:videoId', 'videoId'],
          ['yt:channelId', 'channelId'],
          ['media:community', 'community']
        ]
      }
    });
    // Config now passed per-feed instead of global
  }

  async collectFeed(feedConfig) {
    try {
      console.log(`🎥 Collecting YouTube feed: ${feedConfig.name}`);
      
      // Parse RSS feed
      const feed = await this.parser.parseURL(feedConfig.feedUrl);
      
      // Process each video
      const videos = [];
      for (const item of feed.items.slice(0, 20)) { // Limit to 20 most recent
        try {
          const video = await this.processVideo(item, feedConfig);
          if (video && this.validateItem(video)) {
            videos.push(video);
          }
        } catch (error) {
          console.error(`Error processing video ${item.title}:`, error.message);
        }
      }

      // Process through filtering and scoring
      const selectedVideos = await this.processItems(videos, feedConfig, 3);
      
      this.logStats(feedConfig.name, feed.items.length, videos.length, selectedVideos.length);
      
      return selectedVideos;
    } catch (error) {
      console.error(`Error collecting YouTube feed ${feedConfig.name}:`, error);
      return [];
    }
  }

  async processVideo(item, feedConfig) {
    const videoId = this.extractVideoId(item.link);
    if (!videoId) return null;

    // Get additional video data
    const videoData = await this.getVideoData(videoId);
    
    // Get comments if enabled
    let comments = [];
    if (feedConfig.includeComments) {
      comments = await this.getVideoComments(videoId);
    }

    // Note: Summary is generated later by AISummarizer

    return {
      type: 'youtube',
      title: item.title,
      url: item.link,
      videoId: videoId,
      channelName: feedConfig.name,
      channelId: feedConfig.channelId,
      description: this.extractTextContent(item.contentSnippet || item.content || ''),
      publishedAt: this.parseDate(item.pubDate),
      thumbnail: this.extractThumbnail(item),
      duration: videoData.duration,
      viewCount: videoData.viewCount,
      likeCount: videoData.likeCount,
      commentCount: videoData.commentCount,
      transcript: '',
      tags: videoData.tags || [],
      category: videoData.category,
      comments: comments,
      // AI summary will be added by AISummarizer later
    };
  }

  async getVideoData(videoId) {
    try {
      // In a real implementation, you'd use YouTube Data API
      // For now, we'll return mock data based on typical patterns
      const mockData = {
        duration: 'PT' + Math.floor(Math.random() * 30 + 5) + 'M' + Math.floor(Math.random() * 60) + 'S',
        viewCount: Math.floor(Math.random() * 100000 + 1000),
        likeCount: Math.floor(Math.random() * 5000 + 100),
        commentCount: Math.floor(Math.random() * 500 + 10),
        tags: ['education', 'science', 'mathematics'],
        category: 'Education'
      };
      
      return mockData;
    } catch (error) {
      console.error(`Error getting video data for ${videoId}:`, error);
      return {
        duration: 'PT10M0S',
        viewCount: 1000,
        likeCount: 50,
        commentCount: 10,
        tags: [],
        category: 'Unknown'
      };
    }
  }

  async getVideoComments(videoId) {
    try {
      // In a real implementation, you'd use YouTube Data API to get comments
      // For now, we'll return mock comments that represent typical YouTube feedback
      const mockComments = [
        {
          text: "This is exactly what I needed to understand this concept! Great explanation.",
          likes: 45,
          author: "StudentLearner123",
          publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        },
        {
          text: "Could you make a follow-up video covering the advanced applications?",
          likes: 23,
          author: "CuriousMind",
          publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        },
        {
          text: "The visualization at 5:30 really helped me grasp the concept. Thank you!",
          likes: 67,
          author: "VisualLearner",
          publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        },
        {
          text: "I've been struggling with this topic for weeks. This video finally made it click!",
          likes: 89,
          author: "MathStudent2024",
          publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        },
        {
          text: "Amazing content as always. Your teaching style is so clear and engaging.",
          likes: 34,
          author: "RegularViewer",
          publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString()
        }
      ];

      // Return top comments based on configuration
      return mockComments
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 5); // Default to 5 comments
        
    } catch (error) {
      console.error(`Error getting comments for video ${videoId}:`, error);
      return [];
    }
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  extractThumbnail(item) {
    // Try to get thumbnail from media group
    if (item.mediaGroup && item.mediaGroup['media:thumbnail']) {
      const thumbnails = item.mediaGroup['media:thumbnail'];
      if (Array.isArray(thumbnails) && thumbnails.length > 0) {
        return thumbnails[0].$.url;
      }
    }
    
    // Fallback to default YouTube thumbnail
    const videoId = this.extractVideoId(item.link);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  }

  // Note: Content extraction now handled by Gemini AI analysis

  // Get trending videos (alternative method)
  async getTrendingVideos(region = 'US', category = '28') { // 28 = Science & Technology
    try {
      // This would use YouTube Data API in production
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting trending videos:', error);
      return [];
    }
  }
}

module.exports = YouTubeCollector;