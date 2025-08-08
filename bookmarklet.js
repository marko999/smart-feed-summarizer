/**
 * YouTube Channel Info Bookmarklet
 * 
 * INSTRUCTIONS:
 * 1. Copy the bookmarklet code below
 * 2. Create a new bookmark in your browser
 * 3. Paste the code as the URL
 * 4. Navigate to any YouTube channel page
 * 5. Click the bookmark to extract channel info
 */

// Bookmarklet code (copy this entire line as bookmark URL):
javascript:(function(){
  const channelId = document.querySelector('meta[property="og:url"]')?.content?.match(/channel\/([^\/]+)/)?.[1] || 
                   document.querySelector('link[rel="canonical"]')?.href?.match(/channel\/([^\/]+)/)?.[1] ||
                   window.location.pathname.match(/channel\/([^\/]+)/)?.[1] ||
                   document.querySelector('[data-channel-external-id]')?.getAttribute('data-channel-external-id');
  
  const channelName = document.querySelector('meta[property="og:title"]')?.content?.replace(' - YouTube', '') ||
                     document.querySelector('title')?.textContent?.replace(' - YouTube', '') ||
                     document.querySelector('#channel-name')?.textContent?.trim();
  
  if (!channelId) {
    alert('Could not find channel ID. Make sure you are on a YouTube channel page.');
    return;
  }
  
  const config = {
    channelId: channelId,
    name: channelName,
    topics: ['[ADD_TOPICS_HERE]'],
    weight: 1.0,
    feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  };
  
  const configText = JSON.stringify(config, null, 2);
  
  const popup = window.open('', 'ChannelConfig', 'width=600,height=400');
  popup.document.write(`
    <html>
      <head><title>Channel Configuration</title></head>
      <body style="font-family: monospace; padding: 20px;">
        <h3>YouTube Channel Configuration</h3>
        <p>Copy this JSON configuration:</p>
        <textarea style="width: 100%; height: 200px; font-family: monospace;">${configText}</textarea>
        <p><strong>Next steps:</strong></p>
        <ol>
          <li>Replace "[ADD_TOPICS_HERE]" with relevant topics</li>
          <li>Add this to your feeds configuration file</li>
        </ol>
      </body>
    </html>
  `);
})();

// Human-readable version for manual extraction:
function extractChannelInfoFromPage() {
  // Run this in browser console while on a YouTube channel page
  const channelId = document.querySelector('meta[property="og:url"]')?.content?.match(/channel\/([^\/]+)/)?.[1] || 
                   window.location.pathname.match(/channel\/([^\/]+)/)?.[1];
  
  const channelName = document.querySelector('meta[property="og:title"]')?.content?.replace(' - YouTube', '');
  
  return {
    channelId: channelId,
    name: channelName,
    topics: ['[ADD_TOPICS_HERE]'],
    weight: 1.0,
    feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  };
}