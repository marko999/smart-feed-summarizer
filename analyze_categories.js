const fs = require('fs');

function analyzeFeedCategories() {
  const feeds = JSON.parse(fs.readFileSync('./config/feeds.json', 'utf8'));

  // Define category mappings
  const categories = {
    'AI/ML': ['AI', 'machine learning', 'artificial intelligence', 'deep learning', 'ML', 'automation', 'data science'],
    'Technology': ['technology', 'programming', 'coding', 'web development', 'software', 'development', 'hardware', 'innovation', 'gadgets'],
    'News/Media': ['news', 'current events', 'journalism', 'international news', 'German media'],
    'Science/Math': ['mathematics', 'science', 'physics', 'visualization', 'education', 'algorithms', 'numbers', 'puzzles', 'proofs', 'computer science', 'theory'],
    'Business/Economics': ['business', 'economics', 'finance', 'startups', 'commentary', 'analysis'],
    'Culture/Entertainment': ['culture', 'entertainment', 'movies', 'sports', 'basketball', 'documentaries', 'explainers', 'lifestyle', 'wellness', 'film reviews'],
    'Technical Specialties': ['cybersecurity', 'hacking', 'reviews', 'tutorials', 'papers', 'research']
  };

  // Target distribution
  const targets = {
    'AI/ML': 5,
    'Technology': 2,
    'Science/Math': 1,
    'Culture/Entertainment': 3,
    'Business/Economics': 3,
    'News/Media': 3,
    'Technical Specialties': 2
  };

  function categorizeChannel(topics) {
    for (const [category, keywords] of Object.entries(categories)) {
      if (topics.some(topic => 
        keywords.some(keyword => topic.toLowerCase().includes(keyword.toLowerCase()))
      )) {
        return category;
      }
    }
    return 'Other';
  }

  // Categorize all channels
  const channelsByCategory = {};
  
  feeds.youtube.forEach(channel => {
    const category = categorizeChannel(channel.topics);
    if (!channelsByCategory[category]) channelsByCategory[category] = [];
    channelsByCategory[category].push({...channel, type: 'youtube'});
  });

  feeds.reddit.forEach(subreddit => {
    const category = categorizeChannel(subreddit.topics);
    if (!channelsByCategory[category]) channelsByCategory[category] = [];
    channelsByCategory[category].push({...subreddit, type: 'reddit'});
  });

  console.log('📊 Current Channel Distribution by Category:\n');
  
  Object.entries(channelsByCategory).forEach(([category, channels]) => {
    const target = targets[category] || 0;
    console.log(`${category}: ${channels.length} channels (target: ${target} summaries)`);
    
    channels.forEach(channel => {
      const name = channel.name || `r/${channel.subreddit}`;
      const weight = channel.weight;
      const type = channel.type;
      console.log(`  • ${name} (${type}, weight: ${weight})`);
    });
    console.log();
  });

  return { channelsByCategory, targets };
}

if (require.main === module) {
  analyzeFeedCategories();
}

module.exports = { analyzeFeedCategories };