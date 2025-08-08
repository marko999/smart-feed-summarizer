const fs = require('fs');

function adjustWeights() {
  const feeds = JSON.parse(fs.readFileSync('./config/feeds.json', 'utf8'));

  // User's desired distribution
  const desiredDistribution = {
    'AI/ML': 5,           // up to 5 summaries
    'Technology': 2,       // 2 summaries  
    'Science/Math': 1,     // 1 summary
    'Culture/Entertainment': 3,  // 3 summaries
    'Business/Economics': 3,     // 3 summaries
    'News/Media': 3,       // 3 summaries
    'Technical Specialties': 2   // 2 summaries
  };

  // Manual categorization based on channel analysis
  const channelCategories = {
    // AI/ML (5 summaries - increase weights for top AI channels)
    'Two Minute Papers': 'AI/ML',
    'AI Explained': 'AI/ML', 
    'Anthropic': 'AI/ML',
    'Unsupervised Learning': 'AI/ML',
    'WorldofAI': 'AI/ML',
    'Matt Wolfe': 'AI/ML',
    'Serop | AI Automation': 'AI/ML',
    'r/MachineLearning': 'AI/ML',
    'r/artificial': 'AI/ML',
    
    // Technology (2 summaries - reduce weights)
    'Fireship': 'Technology',
    'ColdFusion': 'Technology',
    'Linus Tech Tips': 'Technology',
    'WIRED': 'Technology',
    'The Verge': 'Technology',
    'Bijan Bowen': 'Technology',
    'GosuCoder': 'Technology',
    'Awesome': 'Technology',
    'Robin Ebers': 'Technology',
    'r/programming': 'Technology',
    'r/technology': 'Technology',
    
    // Science/Math (1 summary - reduce weights significantly)
    '3Blue1Brown': 'Science/Math',
    'Mathologer': 'Science/Math', 
    'Numberphile': 'Science/Math',
    'Veritasium': 'Science/Math',
    'r/compsci': 'Science/Math',
    
    // Culture/Entertainment (3 summaries - increase weights)
    'Vox': 'Culture/Entertainment',
    'RESPIRE': 'Culture/Entertainment', 
    'Hoops Tonight': 'Culture/Entertainment',
    'Howtown': 'Culture/Entertainment',
    'Kermode and Mayo\'s Take': 'Culture/Entertainment',
    'VICE': 'Culture/Entertainment', // Moving VICE from news to culture
    
    // Business/Economics (3 summaries - keep moderate weights)
    'The Atlantic': 'Business/Economics',
    'John Coogan': 'Business/Economics',
    'Micro': 'Business/Economics',
    'Quinn\'s Ideas': 'Business/Economics',
    
    // News/Media (3 summaries - moderate weights)
    'CBC News': 'News/Media',
    'BBC News': 'News/Media',
    'TRT World': 'News/Media',
    'DW Fokus': 'News/Media',
    'Rob Shocks': 'News/Media',
    
    // Technical Specialties (2 summaries)
    'Luke Stephens': 'Technical Specialties'  // cybersecurity
  };

  // Weight adjustments based on desired distribution
  const weightAdjustments = {
    'AI/ML': 1.3,           // High priority
    'Technology': 0.6,      // Reduce significantly  
    'Science/Math': 0.4,    // Reduce drastically (only 1 summary)
    'Culture/Entertainment': 1.1,  // Moderate increase
    'Business/Economics': 1.0,     // Keep stable
    'News/Media': 1.0,      // Keep stable
    'Technical Specialties': 0.9   // Slight reduction
  };

  console.log('🔧 Adjusting weights based on desired content distribution..\\n');

  // Adjust YouTube channel weights
  feeds.youtube.forEach(channel => {
    const category = channelCategories[channel.name];
    if (category) {
      const multiplier = weightAdjustments[category];
      const oldWeight = channel.weight;
      channel.weight = Math.round((oldWeight * multiplier) * 10) / 10; // Round to 1 decimal
      
      // Ensure weight stays within reasonable bounds
      channel.weight = Math.max(0.1, Math.min(2.0, channel.weight));
      
      console.log(`${channel.name}: ${oldWeight} → ${channel.weight} (${category})`);
    }
  });

  // Adjust Reddit subreddit weights  
  feeds.reddit.forEach(subreddit => {
    const category = channelCategories[`r/${subreddit.subreddit}`];
    if (category) {
      const multiplier = weightAdjustments[category];
      const oldWeight = subreddit.weight;
      subreddit.weight = Math.round((oldWeight * multiplier) * 10) / 10;
      
      subreddit.weight = Math.max(0.1, Math.min(2.0, subreddit.weight));
      
      console.log(`r/${subreddit.subreddit}: ${oldWeight} → ${subreddit.weight} (${category})`);
    }
  });

  // Save updated feeds
  fs.writeFileSync('./config/feeds.json', JSON.stringify(feeds, null, 2));
  
  console.log('\\n✅ Weights adjusted and saved to feeds.json');
  console.log('\\n📊 Expected distribution:');
  Object.entries(desiredDistribution).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} summaries`);
  });

  return feeds;
}

if (require.main === module) {
  adjustWeights();
}

module.exports = { adjustWeights };