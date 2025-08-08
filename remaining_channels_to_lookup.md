# Remaining YouTube Channels to Lookup

The following channels need their correct channel IDs identified:

## AI/Machine Learning Channels
- `https://www.youtube.com/@unsupervised-learning` - Topics: ["AI", "machine learning", "artificial intelligence"], Weight: 1.1
- `https://www.youtube.com/@intheworldofai` - Topics: ["AI", "machine learning", "artificial intelligence"], Weight: 1.1  
- `https://www.youtube.com/@anthropic-ai` - Topics: ["AI", "machine learning", "artificial intelligence"], Weight: 1.1
- `https://www.youtube.com/@serop-ai` - Topics: ["AI", "machine learning", "artificial intelligence"], Weight: 1.1

## Tech/Programming Channels  
- `https://www.youtube.com/@GosuCoder` - Topics: ["technology", "programming", "software development"], Weight: 1.0
- `https://www.youtube.com/@awesome-coding` - Topics: ["technology", "programming", "software development"], Weight: 1.0
- `https://www.youtube.com/@itsbyrobin` - Topics: ["technology", "programming", "software development"], Weight: 0.9
- `https://www.youtube.com/@mreflow` - Topics: ["technology", "programming", "software development"], Weight: 0.9
- `https://www.youtube.com/@Bijanbowen` - Topics: ["technology", "programming"], Weight: 0.9
- `https://www.youtube.com/@LukeStephensTV` - Topics: ["cybersecurity", "technology", "hacking"], Weight: 0.9

## Commentary/Analysis Channels
- `https://www.youtube.com/@JohnCooganPlus` - Topics: ["business", "economics", "commentary"], Weight: 0.9
- `https://www.youtube.com/@QuinnsIdeas` - Topics: ["commentary", "analysis", "discussion"], Weight: 0.9
- `https://www.youtube.com/@RobShocks` - Topics: ["commentary", "analysis", "current events"], Weight: 0.9

## Entertainment/Sports Channels  
- `https://www.youtube.com/@HoopsTonight` - Topics: ["sports", "basketball", "entertainment"], Weight: 0.8
- `https://www.youtube.com/kermodeandmayostake` - Topics: ["movies", "film reviews", "entertainment"], Weight: 0.8

## Economics/Finance Channels
- `https://www.youtube.com/@Micro-Econ-YT` - Topics: ["economics", "finance", "analysis"], Weight: 0.9

## Media/Culture Channels
- `https://www.youtube.com/@TheAtlantic` - Topics: ["culture", "politics", "analysis"], Weight: 1.0  
- `https://www.youtube.com/@Howtown` - Topics: ["culture", "documentary", "explainers"], Weight: 0.9
- `https://www.youtube.com/@RespireOfficial` - Topics: ["wellness", "lifestyle", "culture"], Weight: 0.8

## How to Find Channel IDs

1. Visit the channel's main YouTube page
2. Right-click and "View Page Source"  
3. Search for "channel_id=" or look for the RSS feed link
4. Or use browser developer tools to inspect network requests

## Alternative Method
You can also use the existing `extract_channel_info.js` script in this project:
```bash
node extract_channel_info.js "https://www.youtube.com/@channelname"
```

Then manually convert the @handle URLs to proper channel IDs by visiting the channel page.