const fs = require('fs');
const path = require('path');

class ContentDistributionAPI {
    constructor() {
        this.feedsPath = path.join(__dirname, '../../config/feeds.json');
        
        // Category mapping to match frontend
        this.categoryMappings = {
            'aiml': {
                name: 'AI/ML',
                keywords: ['AI', 'machine learning', 'artificial intelligence', 'deep learning', 'ML', 'automation', 'data science'],
                weightMultiplier: 1.3
            },
            'tech': {
                name: 'Technology', 
                keywords: ['technology', 'programming', 'coding', 'web development', 'software', 'development', 'hardware', 'innovation', 'gadgets'],
                weightMultiplier: 0.6
            },
            'science': {
                name: 'Science/Math',
                keywords: ['mathematics', 'science', 'physics', 'visualization', 'education', 'algorithms', 'numbers', 'puzzles', 'proofs', 'computer science', 'theory'],
                weightMultiplier: 0.4
            },
            'culture': {
                name: 'Culture/Entertainment',
                keywords: ['culture', 'entertainment', 'movies', 'sports', 'basketball', 'documentaries', 'explainers', 'lifestyle', 'wellness', 'film reviews'],
                weightMultiplier: 1.1
            },
            'business': {
                name: 'Business/Economics',
                keywords: ['business', 'economics', 'finance', 'startups', 'commentary', 'analysis'],
                weightMultiplier: 1.0
            },
            'news': {
                name: 'News/Media',
                keywords: ['news', 'current events', 'journalism', 'international news', 'German media'],
                weightMultiplier: 1.0
            },
            'technical': {
                name: 'Technical Specialties',
                keywords: ['cybersecurity', 'hacking', 'reviews', 'tutorials', 'papers', 'research'],
                weightMultiplier: 0.9
            }
        };
    }

    categorizeChannel(topics) {
        for (const [categoryId, category] of Object.entries(this.categoryMappings)) {
            if (topics.some(topic => 
                category.keywords.some(keyword => 
                    topic.toLowerCase().includes(keyword.toLowerCase())
                )
            )) {
                return categoryId;
            }
        }
        return 'other';
    }

    calculateWeightForCategory(categoryId, targetCount, totalInCategory) {
        const baseWeight = this.categoryMappings[categoryId]?.weightMultiplier || 1.0;
        
        if (targetCount === 0) {
            return 0.1; // Minimum weight to avoid completely hiding
        }
        
        // Adjust weight based on desired distribution
        // If we want fewer items from a crowded category, reduce weight more
        const distributionFactor = totalInCategory > 0 ? (targetCount / Math.max(totalInCategory, 1)) : 1;
        const adjustedWeight = baseWeight * Math.max(distributionFactor, 0.3);
        
        return Math.round(adjustedWeight * 10) / 10; // Round to 1 decimal
    }

    async updateContentDistribution(distribution) {
        try {
            console.log('📊 Updating content distribution:', distribution);

            // Load current feeds configuration
            const feedsData = JSON.parse(fs.readFileSync(this.feedsPath, 'utf8'));
            
            // Group channels by category
            const channelsByCategory = {};
            
            // Process YouTube channels
            feedsData.youtube.forEach(channel => {
                const category = this.categorizeChannel(channel.topics);
                if (!channelsByCategory[category]) channelsByCategory[category] = [];
                channelsByCategory[category].push({...channel, type: 'youtube'});
            });
            
            // Process Reddit subreddits
            feedsData.reddit.forEach(subreddit => {
                const category = this.categorizeChannel(subreddit.topics);
                if (!channelsByCategory[category]) channelsByCategory[category] = [];
                channelsByCategory[category].push({...subreddit, type: 'reddit'});
            });

            console.log('📋 Channels by category:', Object.keys(channelsByCategory).map(cat => 
                `${cat}: ${channelsByCategory[cat].length}`
            ));

            // Update weights based on distribution preferences
            Object.entries(distribution).forEach(([categoryId, targetCount]) => {
                const channelsInCategory = channelsByCategory[categoryId] || [];
                const totalInCategory = channelsInCategory.length;
                
                console.log(`🎯 ${categoryId}: ${targetCount} target, ${totalInCategory} channels`);
                
                if (totalInCategory === 0) return;
                
                const newWeight = this.calculateWeightForCategory(categoryId, targetCount, totalInCategory);
                
                channelsInCategory.forEach(channel => {
                    if (channel.type === 'youtube') {
                        const ytChannel = feedsData.youtube.find(c => c.channelId === channel.channelId);
                        if (ytChannel) {
                            const oldWeight = ytChannel.weight;
                            ytChannel.weight = newWeight;
                            console.log(`  📺 ${ytChannel.name}: ${oldWeight} → ${newWeight}`);
                        }
                    } else if (channel.type === 'reddit') {
                        const redditChannel = feedsData.reddit.find(s => s.subreddit === channel.subreddit);
                        if (redditChannel) {
                            const oldWeight = redditChannel.weight;
                            redditChannel.weight = newWeight;
                            console.log(`  🔴 r/${redditChannel.subreddit}: ${oldWeight} → ${newWeight}`);
                        }
                    }
                });
            });

            // Save updated feeds configuration
            fs.writeFileSync(this.feedsPath, JSON.stringify(feedsData, null, 2));
            
            console.log('✅ Content distribution updated successfully');
            return { success: true, message: 'Content distribution updated successfully' };
            
        } catch (error) {
            console.error('❌ Error updating content distribution:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentDistribution() {
        try {
            const feedsData = JSON.parse(fs.readFileSync(this.feedsPath, 'utf8'));
            const distribution = {};
            
            // Initialize with zeros
            Object.keys(this.categoryMappings).forEach(cat => {
                distribution[cat] = { count: 0, channels: [] };
            });
            
            // Count YouTube channels
            feedsData.youtube.forEach(channel => {
                const category = this.categorizeChannel(channel.topics);
                if (distribution[category]) {
                    distribution[category].count++;
                    distribution[category].channels.push({
                        name: channel.name,
                        weight: channel.weight,
                        type: 'youtube'
                    });
                }
            });
            
            // Count Reddit subreddits
            feedsData.reddit.forEach(subreddit => {
                const category = this.categorizeChannel(subreddit.topics);
                if (distribution[category]) {
                    distribution[category].count++;
                    distribution[category].channels.push({
                        name: `r/${subreddit.subreddit}`,
                        weight: subreddit.weight,
                        type: 'reddit'
                    });
                }
            });
            
            return { success: true, distribution };
            
        } catch (error) {
            console.error('Error getting current distribution:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = ContentDistributionAPI;