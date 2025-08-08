const BaseCollector = require('./base');
// Using feeds.json now instead of sources.json

class RedditCollector extends BaseCollector {
  constructor() {
    super();
    this.baseUrl = 'https://www.reddit.com';
    // Config now passed per-feed instead of global
  }

  async collectFeed(feedConfig) {
    try {
      console.log(`🔴 Collecting Reddit feed: r/${feedConfig.subreddit}`);
      
      // Fetch hot posts from subreddit
      const url = `${this.baseUrl}/r/${feedConfig.subreddit}/hot.json?limit=25`;
      const data = await this.makeRequest(url);
      
      if (!data.data || !data.data.children) {
        console.error('Invalid Reddit response format');
        return [];
      }

      // Process each post
      const posts = [];
      for (const child of data.data.children) {
        try {
          const post = await this.processPost(child.data, feedConfig);
          if (post && this.validateItem(post)) {
            posts.push(post);
          }
        } catch (error) {
          console.error(`Error processing post ${child.data.title}:`, error.message);
        }
      }

      // Process through filtering and scoring
      const selectedPosts = await this.processItems(posts, feedConfig, 3);
      
      this.logStats(`r/${feedConfig.subreddit}`, data.data.children.length, posts.length, selectedPosts.length);
      
      return selectedPosts;
    } catch (error) {
      console.error(`Error collecting Reddit feed r/${feedConfig.subreddit}:`, error);
      return [];
    }
  }

  async processPost(postData, feedConfig) {
    // Skip certain post types
    if (postData.stickied || postData.pinned) return null;
    if (postData.over_18 && !this.allowNSFW) return null;

    // Get additional post content and comments
    const content = await this.getPostContent(postData);
    
    // Get top comments for analysis
    let topComments = [];
    if (feedConfig.includeComments) {
      topComments = await this.getTopCommentsForAnalysis(postData.permalink);
    }

    return {
      type: 'reddit',
      title: postData.title,
      url: `${this.baseUrl}${postData.permalink}`,
      postId: postData.id,
      subreddit: postData.subreddit,
      author: postData.author,
      description: this.extractTextContent(postData.selftext || ''),
      publishedAt: this.parseDate(new Date(postData.created_utc * 1000)),
      createdAt: this.parseDate(new Date(postData.created_utc * 1000)),
      score: postData.score,
      upvoteRatio: postData.upvote_ratio,
      commentCount: postData.num_comments,
      awards: postData.total_awards_received || 0,
      flair: postData.link_flair_text,
      domain: postData.domain,
      isVideo: postData.is_video,
      isSelf: postData.is_self,
      thumbnail: this.getThumbnail(postData),
      content: content,
      tags: this.extractTags(postData),
      comments: topComments,
      // AI summary will be added by AISummarizer later
    };
  }

  async getPostContent(postData) {
    let content = '';
    
    // Self post content
    if (postData.selftext) {
      content = this.extractTextContent(postData.selftext);
    }
    
    // For link posts, try to get some context
    if (!postData.is_self && postData.url) {
      try {
        // Get top comments for context
        const comments = await this.getTopComments(postData.permalink);
        if (comments.length > 0) {
          content = comments.slice(0, 3).join('\n\n');
        }
      } catch (error) {
        console.log(`Could not get comments for ${postData.id}`);
      }
    }
    
    return content.substring(0, 2000); // Limit content length
  }

  async getTopComments(permalink, limit = 5) {
    try {
      const url = `${this.baseUrl}${permalink}.json?limit=${limit}&sort=top`;
      const data = await this.makeRequest(url);
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        return [];
      }
      
      const commentsData = data[1].data.children;
      const comments = [];
      
      for (const child of commentsData.slice(0, limit)) {
        if (child.data && child.data.body && child.data.body !== '[deleted]') {
          const commentText = this.extractTextContent(child.data.body);
          if (commentText.length > 50) { // Only meaningful comments
            comments.push(commentText);
          }
        }
      }
      
      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  async getTopCommentsForAnalysis(permalink) {
    try {
      const url = `${this.baseUrl}${permalink}.json?limit=${this.config.maxComments}&sort=top`;
      const data = await this.makeRequest(url);
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        return [];
      }
      
      const commentsData = data[1].data.children;
      const comments = [];
      
      for (const child of commentsData.slice(0, this.config.maxComments)) {
        if (child.data && child.data.body && child.data.body !== '[deleted]') {
          const commentText = this.extractTextContent(child.data.body);
          if (commentText.length > 30) { // Only meaningful comments
            comments.push({
              body: commentText.substring(0, 500), // Limit length for analysis
              score: child.data.score || 0,
              author: child.data.author || 'unknown',
              created: child.data.created_utc
            });
          }
        }
      }
      
      // Sort by score and return top comments
      return comments
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxComments);
        
    } catch (error) {
      console.error('Error getting comments for analysis:', error);
      return [];
    }
  }

  getThumbnail(postData) {
    if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
      return postData.thumbnail;
    }
    
    if (postData.preview && postData.preview.images && postData.preview.images.length > 0) {
      const image = postData.preview.images[0];
      if (image.source && image.source.url) {
        return image.source.url.replace(/&amp;/g, '&');
      }
    }
    
    return null;
  }

  extractTags(postData) {
    const tags = [];
    
    // Add subreddit as tag
    tags.push(postData.subreddit);
    
    // Add flair if available
    if (postData.link_flair_text) {
      tags.push(postData.link_flair_text);
    }
    
    // Add domain for link posts
    if (!postData.is_self && postData.domain) {
      tags.push(postData.domain);
    }
    
    // Add content type tags
    if (postData.is_video) tags.push('video');
    if (postData.is_self) tags.push('discussion');
    if (postData.over_18) tags.push('nsfw');
    
    return tags;
  }

  // Get posts from multiple subreddits
  async collectMultipleSubreddits(subreddits, limit = 3) {
    const allPosts = [];
    
    for (const subreddit of subreddits) {
      try {
        const posts = await this.collectFeed(subreddit);
        allPosts.push(...posts);
      } catch (error) {
        console.error(`Error collecting r/${subreddit.subreddit}:`, error);
      }
    }
    
    // Sort by score and return top posts
    allPosts.sort((a, b) => (b.scoring?.totalScore || 0) - (a.scoring?.totalScore || 0));
    return allPosts.slice(0, limit);
  }

  // Get trending posts across multiple subreddits
  async getTrendingPosts(subreddits, timeframe = 'day') {
    const allPosts = [];
    
    for (const subreddit of subreddits) {
      try {
        const url = `${this.baseUrl}/r/${subreddit}/top.json?t=${timeframe}&limit=10`;
        const data = await this.makeRequest(url);
        
        if (data.data && data.data.children) {
          for (const child of data.data.children) {
            const post = await this.processPost(child.data, { subreddit, topics: [], weight: 1.0 });
            if (post) allPosts.push(post);
          }
        }
      } catch (error) {
        console.error(`Error getting trending from r/${subreddit}:`, error);
      }
    }
    
    return allPosts;
  }
}

module.exports = RedditCollector;