# YouTube Channel Information Extraction Guide

## Quick Methods

### Method 1: Using the Extract Script
```bash
node extract_channel_info.js "https://youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw"
node extract_channel_info.js "https://youtube.com/@3blue1brown"
```

### Method 2: Browser Bookmarklet
1. Create a bookmark with this as the URL:
```javascript
javascript:(function(){const channelId=document.querySelector('meta[property="og:url"]')?.content?.match(/channel\/([^\/]+)/)?.[1]||window.location.pathname.match(/channel\/([^\/]+)/)?.[1];const channelName=document.querySelector('meta[property="og:title"]')?.content?.replace(' - YouTube','');if(!channelId){alert('Could not find channel ID');return;}const config={channelId:channelId,name:channelName,topics:['[ADD_TOPICS_HERE]'],weight:1.0,feedUrl:`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`};const configText=JSON.stringify(config,null,2);const popup=window.open('','ChannelConfig','width=600,height=400');popup.document.write(`<html><head><title>Channel Configuration</title></head><body style="font-family: monospace; padding: 20px;"><h3>YouTube Channel Configuration</h3><p>Copy this JSON configuration:</p><textarea style="width: 100%; height: 200px; font-family: monospace;">${configText}</textarea><p><strong>Next steps:</strong></p><ol><li>Replace "[ADD_TOPICS_HERE]" with relevant topics</li><li>Add this to your feeds configuration file</li></ol></body></html>`);})();
```
2. Go to any YouTube channel page
3. Click the bookmark

### Method 3: Manual Extraction

#### Step 1: Get Channel ID
From any YouTube channel page:

**Option A: From URL**
- If URL is `https://youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw`
- Channel ID is: `UCYO_jab_esuFRV4b17AJtAw`

**Option B: From page source**
1. Right-click → "View Source"
2. Search for `"channelId":"` or `"externalId":"`
3. Copy the ID after the colon

**Option C: From RSS feed**
1. Go to `https://youtube.com/channel/[CHANNEL_ID]/videos`
2. View source, search for `RSS` or `feeds`
3. Find the feed URL

#### Step 2: Get Channel Name
- Copy from the channel page title
- Or from the `<title>` tag in page source

#### Step 3: Generate Feed URL
Format: `https://www.youtube.com/feeds/videos.xml?channel_id=[CHANNEL_ID]`

#### Step 4: Choose Topics
Based on channel content, add relevant topics:
- **Educational**: `["education", "tutorials", "learning"]`
- **Tech**: `["technology", "programming", "software"]` 
- **Science**: `["science", "research", "experiments"]`
- **Math**: `["mathematics", "algorithms", "visualization"]`
- **Entertainment**: `["entertainment", "comedy", "gaming"]`

#### Step 5: Set Weight
- **High priority channels**: `1.5 - 2.0`
- **Normal priority**: `1.0`
- **Lower priority**: `0.5 - 0.8`

## Example Configurations

```json
{
  "channelId": "UCYO_jab_esuFRV4b17AJtAw",
  "name": "3Blue1Brown",
  "topics": ["mathematics", "visualization", "education", "algorithms"],
  "weight": 1.5,
  "feedUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw"
}
```

```json
{
  "channelId": "UCsBjURrPoezykLs9EqgamOA",
  "name": "Fireship",
  "topics": ["programming", "web development", "technology", "tutorials"],
  "weight": 1.2,
  "feedUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA"
}
```

## Batch Processing

If you have many channels, create a list and use the script:

```bash
# channels.txt
https://youtube.com/@3blue1brown
https://youtube.com/@fireship
https://youtube.com/@veritasium

# Process all
while read url; do
  node extract_channel_info.js "$url"
done < channels.txt
```

## Troubleshooting

### Channel ID Not Working?
- Some channels use custom URLs (`/c/name` or `/@handle`)
- You may need to visit the channel and look for the canonical URL
- Check the RSS feed directly to confirm the ID

### RSS Feed Empty?
- Channel may not have recent videos
- Check if channel exists and is public
- Some channels disable RSS feeds

### Topics Ideas by Category

**Technology Channels**:
`["technology", "programming", "software", "web development", "mobile", "AI", "blockchain"]`

**Science Channels**:
`["science", "physics", "chemistry", "biology", "research", "experiments", "discoveries"]`

**Educational Channels**:
`["education", "tutorials", "learning", "academic", "courses", "skills"]`

**Entertainment Channels**:
`["entertainment", "comedy", "gaming", "movies", "music", "culture"]`