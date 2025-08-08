#!/usr/bin/env node

/**
 * Extract YouTube Channel Information for Feed Configuration
 * Usage: node extract_channel_info.js <channel_url>
 */

const https = require('https');
const { URL } = require('url');

async function extractChannelInfo(channelUrl) {
  console.log(`🔍 Extracting info for: ${channelUrl}`);
  
  try {
    // Extract channel ID from URL
    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      throw new Error('Could not extract channel ID from URL');
    }
    
    console.log(`📺 Channel ID: ${channelId}`);
    
    // Get channel name from RSS feed
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const channelName = await getChannelNameFromRSS(feedUrl);
    
    // Generate feed configuration
    const config = {
      channelId: channelId,
      name: channelName,
      topics: ["[ADD_TOPICS_HERE]"], // You'll need to fill this manually
      weight: 1.0,
      feedUrl: feedUrl
    };
    
    console.log('\n📋 Feed Configuration:');
    console.log(JSON.stringify(config, null, 2));
    
    console.log('\n✏️ Manual steps needed:');
    console.log('1. Replace "[ADD_TOPICS_HERE]" with relevant topics like:');
    console.log('   ["mathematics", "education", "science", "tutorials"]');
    console.log('2. Adjust weight (0.1 to 2.0) based on priority');
    
    return config;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

function extractChannelId(url) {
  // Handle different YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,           // /channel/UCXXX
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,                 // /c/channelname  
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,              // /user/username
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,                   // /@handle
    /youtu\.be\/channel\/([a-zA-Z0-9_-]+)/               // youtu.be/channel/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // For /channel/ URLs, return the ID directly
      if (pattern.source.includes('channel')) {
        return match[1];
      }
      // For other formats, we have the username/handle but need the actual channel ID
      // This would require YouTube API to resolve, so we'll show a note
      console.log(`⚠️ Found username/handle: ${match[1]}`);
      console.log('⚠️ You may need to convert this to channel ID manually');
      return match[1]; // Return as-is for now
    }
  }
  
  return null;
}

async function getChannelNameFromRSS(feedUrl) {
  return new Promise((resolve, reject) => {
    const request = https.get(feedUrl, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          // Extract channel name from RSS title
          const titleMatch = data.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
          if (titleMatch) {
            resolve(titleMatch[1]);
          } else {
            // Fallback pattern
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

// CLI usage
if (require.main === module) {
  const channelUrl = process.argv[2];
  
  if (!channelUrl) {
    console.log('Usage: node extract_channel_info.js <youtube_channel_url>');
    console.log('');
    console.log('Examples:');
    console.log('  node extract_channel_info.js "https://youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw"');
    console.log('  node extract_channel_info.js "https://youtube.com/@3blue1brown"');
    console.log('  node extract_channel_info.js "https://youtube.com/c/3blue1brown"');
    process.exit(1);
  }
  
  extractChannelInfo(channelUrl);
}

module.exports = { extractChannelInfo, extractChannelId };