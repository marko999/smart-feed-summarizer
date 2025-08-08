const YouTubeCollector = require('../collectors/youtube');
const RedditCollector = require('../collectors/reddit');
const fs = require('fs');

class PreviewModeAPI {
    constructor() {
        this.youtubeCollector = new YouTubeCollector();
        this.redditCollector = new RedditCollector();
        // No longer needed - using feedsConfig directly
        this.feedsConfig = require('../../config/feeds.json');
    }

    async collectPreviews() {
        console.log('🔍 Collecting content previews...');
        
        const allPreviews = {
            youtube: [],
            reddit: [],
            stats: {
                totalItems: 0,
                youtubeItems: 0,
                redditItems: 0,
                categories: {}
            }
        };

        try {
            // Collect YouTube previews
            console.log('📺 Fetching YouTube previews...');
            for (const feedConfig of this.feedsConfig.youtube) {
                try {
                    console.log(`  • ${feedConfig.name}...`);
                    const videos = await this.collectYouTubePreviews(feedConfig);
                    
                    // Add category information
                    videos.forEach(video => {
                        video.category = this.categorizeContent(video.topics || []);
                        video.channelWeight = feedConfig.weight;
                        video.selected = false; // Initially not selected
                    });
                    
                    allPreviews.youtube.push(...videos);
                    allPreviews.stats.youtubeItems += videos.length;
                    
                    // Count by category
                    videos.forEach(video => {
                        const cat = video.category;
                        allPreviews.stats.categories[cat] = (allPreviews.stats.categories[cat] || 0) + 1;
                    });
                    
                } catch (error) {
                    console.error(`❌ Error collecting from ${feedConfig.name}:`, error.message);
                }
            }

            // Collect Reddit previews
            console.log('🔴 Fetching Reddit previews...');
            for (const feedConfig of this.feedsConfig.reddit) {
                try {
                    console.log(`  • r/${feedConfig.subreddit}...`);
                    const posts = await this.collectRedditPreviews(feedConfig);
                    
                    // Add category information
                    posts.forEach(post => {
                        post.category = this.categorizeContent(post.topics || []);
                        post.subredditWeight = feedConfig.weight;
                        post.selected = false; // Initially not selected
                    });
                    
                    allPreviews.reddit.push(...posts);
                    allPreviews.stats.redditItems += posts.length;
                    
                    // Count by category
                    posts.forEach(post => {
                        const cat = post.category;
                        allPreviews.stats.categories[cat] = (allPreviews.stats.categories[cat] || 0) + 1;
                    });
                    
                } catch (error) {
                    console.error(`❌ Error collecting from r/${feedConfig.subreddit}:`, error.message);
                }
            }

            allPreviews.stats.totalItems = allPreviews.stats.youtubeItems + allPreviews.stats.redditItems;

            console.log(`✅ Preview collection completed!`);
            console.log(`   YouTube items: ${allPreviews.stats.youtubeItems}`);
            console.log(`   Reddit items: ${allPreviews.stats.redditItems}`);
            console.log(`   Total items: ${allPreviews.stats.totalItems}`);
            console.log(`   Categories:`, allPreviews.stats.categories);

            return {
                success: true,
                previews: allPreviews,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Preview collection failed:', error);
            return {
                success: false,
                error: error.message,
                previews: allPreviews
            };
        }
    }

    async collectYouTubePreviews(feedConfig) {
        try {
            // Use existing YouTube collector but without AI analysis for previews
            const feed = await this.youtubeCollector.parser.parseURL(feedConfig.feedUrl);
            const previews = [];

            for (const item of feed.items.slice(0, 10)) { // Get more items for preview
                const videoId = this.youtubeCollector.extractVideoId(item.link);
                if (!videoId) continue;

                const videoData = await this.youtubeCollector.getVideoData(videoId);
                
                const contentText = this.youtubeCollector.extractTextContent(item.contentSnippet || item.content || '');
                const preview = {
                    id: `yt_${videoId}`,
                    type: 'youtube',
                    videoId: videoId,
                    title: item.title,
                    url: item.link, // This is the key field for gemini-cli
                    channelName: feedConfig.name,
                    channelId: feedConfig.channelId,
                    description: contentText,
                    publishedAt: this.youtubeCollector.parseDate(item.pubDate),
                    thumbnail: this.youtubeCollector.extractThumbnail(item),
                    duration: videoData.duration,
                    viewCount: videoData.viewCount,
                    likeCount: videoData.likeCount,
                    commentCount: videoData.commentCount,
                    tags: videoData.tags || [],
                    category: videoData.category,
                    topics: feedConfig.topics,
                    weight: feedConfig.weight,
                    // Preview specific fields
                    previewScore: this.calculatePreviewScore(item, videoData, feedConfig),
                    freshness: this.calculateFreshness(item.pubDate)
                };

                previews.push(preview);
            }

            return previews.filter(p => this.youtubeCollector.validateItem(p));
            
        } catch (error) {
            console.error(`Error collecting YouTube previews for ${feedConfig.name}:`, error);
            return [];
        }
    }

    async collectRedditPreviews(feedConfig) {
        try {
            const url = `https://www.reddit.com/r/${feedConfig.subreddit}/hot.json?limit=15`;
            const data = await this.redditCollector.makeRequest(url);
            
            if (!data.data || !data.data.children) {
                return [];
            }

            const previews = [];

            for (const child of data.data.children) {
                const postData = child.data;
                
                // Skip stickied/pinned posts
                if (postData.stickied || postData.pinned) continue;
                if (postData.over_18 && !this.allowNSFW) continue;

                const contentText = this.redditCollector.extractTextContent(postData.selftext || '');
                const preview = {
                    id: `reddit_${postData.id}`,
                    type: 'reddit',
                    title: postData.title,
                    url: `https://www.reddit.com${postData.permalink}`, // This is the key field for gemini-cli
                    postId: postData.id,
                    subreddit: postData.subreddit,
                    author: postData.author,
                    description: contentText.substring(0, 300),
                    publishedAt: this.redditCollector.parseDate(new Date(postData.created_utc * 1000)),
                    score: postData.score,
                    upvoteRatio: postData.upvote_ratio,
                    commentCount: postData.num_comments,
                    awards: postData.total_awards_received || 0,
                    flair: postData.link_flair_text,
                    domain: postData.domain,
                    isVideo: postData.is_video,
                    isSelf: postData.is_self,
                    thumbnail: this.redditCollector.getThumbnail(postData),
                    topics: feedConfig.topics,
                    weight: feedConfig.weight,
                    // Preview specific fields
                    previewScore: this.calculateRedditPreviewScore(postData, feedConfig),
                    freshness: this.calculateFreshness(new Date(postData.created_utc * 1000))
                };

                previews.push(preview);
            }

            return previews.filter(p => this.redditCollector.validateItem(p));
            
        } catch (error) {
            console.error(`Error collecting Reddit previews for r/${feedConfig.subreddit}:`, error);
            return [];
        }
    }

    calculatePreviewScore(item, videoData, feedConfig) {
        let score = 0;
        
        // Base weight from feed configuration
        score += (feedConfig.weight || 1.0) * 20;
        
        // Engagement metrics
        if (videoData.viewCount) {
            score += Math.min(videoData.viewCount / 1000, 50); // Cap at 50 points
        }
        
        if (videoData.likeCount && videoData.viewCount) {
            const likeRatio = videoData.likeCount / videoData.viewCount;
            score += likeRatio * 30;
        }
        
        // Freshness bonus
        const daysAgo = (Date.now() - new Date(item.pubDate)) / (1000 * 60 * 60 * 24);
        if (daysAgo < 1) score += 20;
        else if (daysAgo < 7) score += 10;
        
        return Math.round(score);
    }

    calculateRedditPreviewScore(postData, feedConfig) {
        let score = 0;
        
        // Base weight from feed configuration  
        score += (feedConfig.weight || 1.0) * 20;
        
        // Reddit engagement
        score += Math.min(postData.score / 10, 30);
        
        if (postData.upvote_ratio) {
            score += postData.upvote_ratio * 20;
        }
        
        // Comment engagement
        if (postData.num_comments) {
            score += Math.min(postData.num_comments / 2, 20);
        }
        
        // Awards bonus
        if (postData.total_awards_received) {
            score += Math.min(postData.total_awards_received * 5, 25);
        }
        
        // Freshness
        const hoursAgo = (Date.now() - (postData.created_utc * 1000)) / (1000 * 60 * 60);
        if (hoursAgo < 6) score += 15;
        else if (hoursAgo < 24) score += 10;
        
        return Math.round(score);
    }

    calculateFreshness(date) {
        const now = Date.now();
        const itemTime = new Date(date).getTime();
        const hoursAgo = (now - itemTime) / (1000 * 60 * 60);
        
        if (hoursAgo < 1) return 'just-posted';
        if (hoursAgo < 6) return 'very-fresh';
        if (hoursAgo < 24) return 'fresh';
        if (hoursAgo < 48) return 'recent';
        return 'older';
    }

    categorizeContent(topics) {
        // Priority order - more specific categories first to avoid misclassification
        const categoryMappings = [
            {
                name: 'Culture/Entertainment', 
                keywords: ['culture', 'entertainment', 'movies', 'sports', 'basketball', 'documentaries', 'explainers', 'lifestyle', 'wellness', 'film reviews']
            },
            {
                name: 'AI/ML', 
                keywords: ['AI', 'machine learning', 'artificial intelligence', 'deep learning', 'ML', 'automation', 'data science']
            },
            {
                name: 'Technical Specialties', 
                keywords: ['cybersecurity', 'hacking', 'reviews', 'tutorials', 'papers', 'research']
            },
            {
                name: 'Science/Math', 
                keywords: ['mathematics', 'science', 'physics', 'visualization', 'education', 'algorithms', 'numbers', 'puzzles', 'proofs', 'computer science', 'theory']
            },
            {
                name: 'Business/Economics', 
                keywords: ['business', 'economics', 'finance', 'startups', 'commentary', 'analysis']
            },
            {
                name: 'News/Media', 
                keywords: ['news', 'current events', 'journalism', 'international news', 'German media']
            },
            {
                name: 'Technology', 
                keywords: ['technology', 'programming', 'coding', 'web development', 'software', 'development', 'hardware', 'innovation', 'gadgets']
            }
        ];

        // Check categories in priority order
        for (const category of categoryMappings) {
            if (topics.some(topic => 
                category.keywords.some(keyword => topic.toLowerCase().includes(keyword.toLowerCase()))
            )) {
                return category.name;
            }
        }
        return 'Other';
    }

    async getPreviewSelection(selectedIds) {
        // Return only the selected items for summarization
        console.log(`📝 Processing ${selectedIds.length} selected items for summarization...`);
        return {
            success: true,
            selectedCount: selectedIds.length,
            message: `${selectedIds.length} items selected for summarization`
        };
    }
}

module.exports = PreviewModeAPI;