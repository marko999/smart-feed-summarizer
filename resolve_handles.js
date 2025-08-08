#!/usr/bin/env node

const { exec } = require('child_process');
const https = require('https');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function resolveChannelId(handleUrl) {
  try {
    const { stdout } = await execAsync(`curl -s "${handleUrl}" | grep -o 'channel_id=[^"&]*' | head -1`);
    const match = stdout.trim().match(/channel_id=(.+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error(`Error resolving ${handleUrl}:`, error.message);
    return null;
  }
}

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
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

const channelTopics = {
  '@anthropic-ai': ['AI', 'machine learning', 'artificial intelligence'],
  '@unsupervised-learning': ['AI', 'machine learning', 'data science'],
  '@intheworldofai': ['AI', 'machine learning', 'artificial intelligence'],
  '@Bijanbowen': ['technology', 'programming'],
  '@GosuCoder': ['programming', 'coding', 'tutorials'],
  '@mreflow': ['programming', 'web development', 'tutorials'],
  '@HoopsTonight': ['sports', 'basketball', 'entertainment'],
  '@RobShocks': ['commentary', 'analysis', 'current events'],
  '@awesome-coding': ['programming', 'coding', 'tutorials'],
  '@itsbyrobin': ['programming', 'web development', 'tutorials'],
  '@RespireOfficial': ['wellness', 'lifestyle', 'culture'],
  '@Howtown': ['culture', 'documentary', 'explainers'],
  '@TheAtlantic': ['culture', 'politics', 'analysis'],
  '@JohnCooganPlus': ['business', 'economics', 'commentary'],
  '@dwfokus': ['international news', 'German media', 'current events'],
  '@Micro-Econ-YT': ['economics', 'finance', 'analysis'],
  '@LukeStephensTV': ['cybersecurity', 'technology', 'hacking'],
  '@QuinnsIdeas': ['commentary', 'analysis', 'discussion'],
  '@serop-ai': ['AI', 'machine learning', 'artificial intelligence']
};

const channelWeights = {
  '@anthropic-ai': 1.2,
  '@unsupervised-learning': 1.1,
  '@intheworldofai': 1.1,
  '@Bijanbowen': 0.9,
  '@GosuCoder': 1.0,
  '@mreflow': 0.9,
  '@HoopsTonight': 0.8,
  '@RobShocks': 0.9,
  '@awesome-coding': 1.0,
  '@itsbyrobin': 0.9,
  '@RespireOfficial': 0.8,
  '@Howtown': 0.9,
  '@TheAtlantic': 1.0,
  '@JohnCooganPlus': 0.9,
  '@dwfokus': 1.0,
  '@Micro-Econ-YT': 0.9,
  '@LukeStephensTV': 0.9,
  '@QuinnsIdeas': 0.9,
  '@serop-ai': 1.1
};

async function main() {
  const handles = [
    'https://www.youtube.com/@anthropic-ai',
    'https://www.youtube.com/@unsupervised-learning',
    'https://www.youtube.com/@intheworldofai',
    'https://www.youtube.com/@Bijanbowen',
    'https://www.youtube.com/@GosuCoder',
    'https://www.youtube.com/@mreflow',
    'https://www.youtube.com/@HoopsTonight',
    'https://www.youtube.com/@RobShocks',
    'https://www.youtube.com/@awesome-coding',
    'https://www.youtube.com/@itsbyrobin',
    'https://www.youtube.com/@RespireOfficial',
    'https://www.youtube.com/@Howtown',
    'https://www.youtube.com/@TheAtlantic',
    'https://www.youtube.com/@JohnCooganPlus',
    'https://www.youtube.com/@dwfokus',
    'https://www.youtube.com/@Micro-Econ-YT',
    'https://www.youtube.com/@LukeStephensTV',
    'https://www.youtube.com/@QuinnsIdeas',
    'https://www.youtube.com/@serop-ai'
  ];

  console.log('🔍 Resolving @handle URLs to channel IDs...\n');
  
  const results = [];
  
  for (const handleUrl of handles) {
    const handle = handleUrl.split('/').pop();
    console.log(`Processing ${handle}...`);
    
    try {
      const channelId = await resolveChannelId(handleUrl);
      
      if (channelId) {
        const channelName = await getChannelNameFromRSS(channelId);
        
        const config = {
          channelId: channelId,
          name: channelName,
          topics: channelTopics[handle] || ['general'],
          weight: channelWeights[handle] || 1.0,
          feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        };
        
        results.push(config);
        console.log(`  ✅ ${channelName} (${channelId})`);
      } else {
        console.log(`  ❌ Could not resolve ${handle}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`  ❌ Error with ${handle}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Successfully resolved ${results.length} channels:\n`);
  console.log(JSON.stringify(results, null, 2));
  
  // Also handle the non-@ URLs
  console.log('\n\n🔍 Processing non-@ URLs...\n');
  
  const nonHandleUrls = [
    'https://www.youtube.com/kermodeandmayostake',
    'https://www.youtube.com/Vice' // Note: this was already processed as VICE
  ];
  
  for (const url of nonHandleUrls) {
    console.log(`Processing ${url}...`);
    try {
      const channelId = await resolveChannelId(url);
      if (channelId && channelId !== 'UCn8zNIfYAQNdrFRrr8oibKw') { // Skip VICE since already added
        const channelName = await getChannelNameFromRSS(channelId);
        console.log(`  ✅ ${channelName} (${channelId})`);
        
        const config = {
          channelId: channelId,
          name: channelName,
          topics: url.includes('kermode') ? ['movies', 'film reviews', 'entertainment'] : ['general'],
          weight: 0.8,
          feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        };
        
        results.push(config);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resolveChannelId, getChannelNameFromRSS };