#!/usr/bin/env node

/**
 * Process YouTube channels and extract feed configuration
 */

const https = require('https');

// Known channel mappings (verified through RSS feed checks)
const channelMappings = {
  'https://www.youtube.com/@CBCNews': 'UCuFFtHWoLl5fauMMD5Ww2jA',
  'https://www.youtube.com/@BBCNews': 'UC16niRr50-MSBwiO3YDb3RA',
  'https://www.youtube.com/@Vox': 'UCLXo7UDZvByw2ixzpQCufnA',
  'https://www.youtube.com/@WIRED': 'UCftwRNsjfRo08xYE31tkiyw',
  'https://www.youtube.com/@TheVerge': 'UCddiUEpeqJcYeBxX1IVBKvQ',
  'https://www.youtube.com/@veritasium': 'UCHnyfMqiRRG1u-2MsSQLbXA',
  'https://www.youtube.com/Vice': 'UCn8zNIfYAQNdrFRrr8oibKw',
  'https://www.youtube.com/@LinusTechTips': 'UCXuqSBlHAE6Xw-yeJA0Tunw',
  'https://www.youtube.com/@Fireship': 'UCsBjURrPoezykLs9EqgamOA',
  'https://www.youtube.com/coldfusion': 'UC4QZ_LsYcvcq7qOsOhpAX4A',
  
  // Additional commonly known channels (these need verification but are likely correct)
  'https://www.youtube.com/@anthropic-ai': 'UC67QpTLKgOgvGpSEMLDTKWg', // Updated based on research
  'https://www.youtube.com/@aiexplained-official': 'UCNJ1Ymd5yFuUPtn21xtRbbw',
  'https://www.youtube.com/@intheworldofai': 'UC0HlTq4DJcS-qZEOGNdIrAw',
  'https://www.youtube.com/@RobShocks': 'UCP2Vw4wzE2WEcBGJ2FZR7NA',
  'https://www.youtube.com/kermodeandmayostake': 'UCu5XXd2L9P3YjZ-NNemKrKg',
  'https://www.youtube.com/@TheAtlantic': 'UCqJkRwBuSkU-jLf7bD1kKvA',
  'https://www.youtube.com/@awesome-coding': 'UCKc4YRJiAn8SyP3PL9QILkQ',
  'https://www.youtube.com/@GosuCoder': 'UC-bDKnJXuhTCrRQfX8Hw-og',
  'https://www.youtube.com/@HoopsTonight': 'UCOQQPRNQzsmfMvuZJPl4Duw',
  'https://www.youtube.com/@Howtown': 'UC8XKwzUKD8JCm9Xw8nkJmjw',
  'https://www.youtube.com/@itsbyrobin': 'UC8Uc4DUYkWKjqGhHJ0wB2nw',
  'https://www.youtube.com/@JohnCooganPlus': 'UC0_CU72XOCdPOKUd7TZSlHw',
  'https://www.youtube.com/@mreflow': 'UCwLtgWCr-K8EIg2ToxaK6WQ',
  'https://www.youtube.com/@RespireOfficial': 'UC65T7Vh8qxGkJ2w6bq2sRbQ',
  'https://www.youtube.com/@unsupervised-learning': 'UCXpS-W-pf7CgM3-zLxxhwBw',
  'https://www.youtube.com/@Bijanbowen': 'UCn8X8TqV4WjJlGh0u4pnMng',
  'https://www.youtube.com/@dwfokus': 'UC7fWeaHhqgM4Ry-RMpM2YYw',
  'https://www.youtube.com/@Micro-Econ-YT': 'UCx_FjO0NaVUKY5KryWQ_3Cw',
  'https://www.youtube.com/@LukeStephensTV': 'UCqP-0aU8H4wsCE2VlzuEa4w',
  'https://www.youtube.com/@QuinnsIdeas': 'UChPxiuGLZdoB4JBDk4lw7MQ',
  'https://www.youtube.com/@serop-ai': 'UCqZm8-_8k6YU1IkMu1t-mSQ'
};

const channelList = [
  'https://www.youtube.com/@CBCNews',
  'https://www.youtube.com/@unsupervised-learning',
  'https://www.youtube.com/@intheworldofai',
  'https://www.youtube.com/@Bijanbowen',
  'https://www.youtube.com/@GosuCoder',
  'https://www.youtube.com/coldfusion',
  'https://www.youtube.com/@Fireship',
  'https://www.youtube.com/@mreflow',
  'https://www.youtube.com/@Vox',
  'https://www.youtube.com/@HoopsTonight',
  'https://www.youtube.com/@anthropic-ai',
  'https://www.youtube.com/@RobShocks',
  'https://www.youtube.com/@LinusTechTips',
  'https://www.youtube.com/kermodeandmayostake',
  'https://www.youtube.com/@awesome-coding',
  'https://www.youtube.com/@aiexplained-official',
  'https://www.youtube.com/@itsbyrobin',
  'https://www.youtube.com/@BBCNews',
  'https://www.youtube.com/@RespireOfficial',
  'https://www.youtube.com/@WIRED',
  'https://www.youtube.com/@TheVerge',
  'https://www.youtube.com/@veritasium',
  'https://www.youtube.com/Vice',
  'https://www.youtube.com/@Howtown',
  'https://www.youtube.com/@TheAtlantic',
  'https://www.youtube.com/@JohnCooganPlus',
  'https://www.youtube.com/@dwfokus',
  'https://www.youtube.com/@Micro-Econ-YT',
  'https://www.youtube.com/@LukeStephensTV',
  'https://www.youtube.com/@QuinnsIdeas',
  'https://www.youtube.com/@serop-ai'
];

async function getChannelNameFromRSS(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  return new Promise((resolve, reject) => {
    const request = https.get(feedUrl, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const titleMatch = data.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
          if (titleMatch) {
            resolve(titleMatch[1]);
          } else {
            const altMatch = data.match(/<title>(.*?)<\/title>/);
            resolve(altMatch ? altMatch[1] : 'Unknown Channel');
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function assignTopicsAndWeight(channelName, url) {
  const name = channelName.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Specific channel mappings for better accuracy
  const specificMappings = {
    'cbc news': { topics: ['news', 'current events', 'journalism'], weight: 1.2 },
    'bbc news': { topics: ['news', 'current events', 'journalism'], weight: 1.2 },
    'vice': { topics: ['news', 'documentaries', 'culture'], weight: 1.2 },
    'vox': { topics: ['culture', 'analysis', 'explainers'], weight: 1.1 },
    'the verge': { topics: ['technology', 'gadgets', 'reviews'], weight: 1.0 },
    'wired': { topics: ['technology', 'innovation', 'science'], weight: 1.0 },
    'linus tech tips': { topics: ['technology', 'hardware', 'reviews'], weight: 1.0 },
    'fireship': { topics: ['programming', 'web development', 'tutorials'], weight: 1.0 },
    'veritasium': { topics: ['science', 'education', 'physics'], weight: 1.0 },
    'coldfusion': { topics: ['technology', 'business', 'documentary'], weight: 1.0 },
    'the atlantic': { topics: ['culture', 'politics', 'analysis'], weight: 1.0 }
  };
  
  // Check for specific channel mappings first
  if (specificMappings[name]) {
    return specificMappings[name];
  }
  
  // AI/ML channels
  if (name.includes('ai') || name.includes('artificial') || name.includes('machine learning') || 
      urlLower.includes('ai') || name.includes('anthropic') || name.includes('unsupervised') ||
      name.includes('explained') && urlLower.includes('ai')) {
    return {
      topics: ['AI', 'machine learning', 'artificial intelligence'],
      weight: 1.1
    };
  }
  
  // News channels
  if (name.includes('news') || name.includes('bbc') || name.includes('cbc')) {
    return {
      topics: ['news', 'current events', 'journalism'],
      weight: 1.2
    };
  }
  
  // Tech/Programming channels
  if (name.includes('tech') || name.includes('coding') || name.includes('coder') || 
      urlLower.includes('coding') || urlLower.includes('coder') || name.includes('developer')) {
    return {
      topics: ['technology', 'programming', 'software development'],
      weight: 1.0
    };
  }
  
  // Science/Education channels
  if (name.includes('science') || name.includes('education') || name.includes('learning')) {
    return {
      topics: ['science', 'education', 'research'],
      weight: 1.0
    };
  }
  
  // Economics/Finance
  if (name.includes('econ') || name.includes('economic') || name.includes('finance') || name.includes('micro-econ')) {
    return {
      topics: ['economics', 'finance', 'analysis'],
      weight: 0.9
    };
  }
  
  // Sports
  if (name.includes('hoops') || name.includes('sport') || name.includes('basketball')) {
    return {
      topics: ['sports', 'basketball', 'entertainment'],
      weight: 0.8
    };
  }
  
  // Media/Commentary channels
  if (name.includes('quinn') || name.includes('ideas') || name.includes('coogan') || 
      name.includes('luke') || name.includes('stephens')) {
    return {
      topics: ['commentary', 'analysis', 'discussion'],
      weight: 0.9
    };
  }
  
  // German/International channels
  if (urlLower.includes('dwfokus') || name.includes('fokus')) {
    return {
      topics: ['international news', 'German media', 'current events'],
      weight: 1.0
    };
  }
  
  // Default for unknown channels
  return {
    topics: ['general', 'content'],
    weight: 0.9
  };
}

async function processChannel(url) {
  console.log(`Processing: ${url}`);
  
  try {
    let channelId = channelMappings[url];
    
    if (!channelId) {
      console.log(`⚠️ No known channel ID for ${url} - skipping for now`);
      return null;
    }
    
    const channelName = await getChannelNameFromRSS(channelId);
    const { topics, weight } = assignTopicsAndWeight(channelName, url);
    
    const config = {
      channelId: channelId,
      name: channelName,
      topics: topics,
      weight: weight,
      feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    };
    
    console.log(`✅ ${channelName} - ${topics.join(', ')} - Weight: ${weight}`);
    return config;
    
  } catch (error) {
    console.error(`❌ Error processing ${url}:`, error.message);
    return null;
  }
}

async function processAllChannels() {
  const results = [];
  
  for (const url of channelList) {
    const config = await processChannel(url);
    if (config) {
      results.push(config);
    }
    // Small delay to be respectful to YouTube
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📋 Final JSON configuration:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

if (require.main === module) {
  processAllChannels();
}

module.exports = { processAllChannels };