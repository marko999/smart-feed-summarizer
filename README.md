# 🧠 Smart Feed Summarizer

An AI-powered content aggregator that intelligently curates and summarizes the best content from your favorite YouTube channels and Reddit communities.

## ✨ Features

- **🎯 Smart Content Selection**: Uses advanced weight algorithms to pick the top 3 items per feed
- **🤖 AI Summarization**: Powered by OpenAI GPT with intelligent fallbacks
- **📺 YouTube Integration**: Extracts video transcripts and metadata
- **🔴 Reddit Integration**: Analyzes posts and top comments
- **🎨 Beautiful Dashboard**: Modern, responsive web interface
- **⚡ Automated Updates**: Scheduled content collection every 6 hours
- **📊 Smart Scoring**: Multi-factor scoring based on engagement, recency, and relevance

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key (optional but recommended)
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Open Dashboard**
   Navigate to `http://localhost:3000`

## ⚙️ Configuration

### Feed Configuration (`config/feeds.json`)

Add your favorite YouTube channels and Reddit communities:

```json
{
  "youtube": [
    {
      "channelId": "UCYO_jab_esuFRV4b17AJtAw",
      "name": "3Blue1Brown",
      "topics": ["mathematics", "visualization"],
      "weight": 1.0,
      "feedUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UCYO_jab_esuFRV4b17AJtAw"
    }
  ],
  "reddit": [
    {
      "subreddit": "MachineLearning",
      "topics": ["AI", "ML", "research"],
      "weight": 1.0,
      "feedUrl": "https://www.reddit.com/r/MachineLearning/hot.json"
    }
  ]
}
```

### Topics Configuration (`config/topics.json`)

Customize your interests and keywords for better content matching.

## 🧮 Weight Algorithm

The smart selection algorithm considers:

- **Engagement (30%)**: Views, likes, upvotes, comments
- **Recency (25%)**: How recent the content is
- **Topic Match (25%)**: Relevance to your configured interests
- **Quality (15%)**: Content length, discussion quality
- **Source (5%)**: Source credibility and weight

## 🎨 Dashboard Features

- **📊 Real-time Stats**: Track collection metrics
- **🔍 Smart Filtering**: Filter by type, search content
- **📈 Multiple Sorting**: Sort by score, date, or engagement
- **📱 Responsive Design**: Works on all devices
- **📥 Export Options**: Export summaries as JSON

## 🤖 AI Summarization

- **Primary**: OpenAI GPT-3.5/4 for intelligent summaries
- **Fallback**: Extractive summarization when AI unavailable
- **Smart Prompts**: Context-aware prompts for different content types
- **Quality Control**: Length limits and content validation

## 📅 Automation

- **Scheduled Updates**: Automatic collection every 6 hours
- **Manual Refresh**: Trigger updates via dashboard
- **Error Recovery**: Robust error handling and retry logic
- **Performance Monitoring**: Track collection success rates

## 🛠️ Development

### Project Structure
```
smart-feed-summarizer/
├── config/           # Feed and topic configurations
├── src/
│   ├── collectors/   # YouTube and Reddit collectors
│   ├── scoring/      # Weight algorithm and filters
│   └── ai/          # AI summarization engine
├── public/          # Dashboard frontend
└── server.js        # Main server
```

### Scripts
```bash
npm run dev          # Development mode with auto-reload
npm run collect      # Test collection manually
npm test            # Run tests
```

### Adding New Feed Sources

1. Create a new collector in `src/collectors/`
2. Extend `BaseCollector` class
3. Implement `collectFeed(feedConfig)` method
4. Add configuration to `config/feeds.json`

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI summaries | None |
| `PORT` | Server port | 3000 |
| `UPDATE_SCHEDULE` | Cron schedule for updates | `0 */6 * * *` |
| `WEIGHT_ENGAGEMENT` | Engagement weight factor | 0.3 |
| `WEIGHT_RECENCY` | Recency weight factor | 0.25 |
| `WEIGHT_TOPIC_MATCH` | Topic relevance weight | 0.25 |
| `WEIGHT_QUALITY` | Content quality weight | 0.15 |
| `WEIGHT_SOURCE` | Source credibility weight | 0.05 |

## 📊 API Endpoints

- `GET /api/summaries` - Get current summaries
- `POST /api/collect` - Trigger manual collection
- `GET /api/status` - Get collection status

## 🎯 Use Cases

- **📚 Research**: Stay updated with latest papers and discussions
- **🎓 Learning**: Curated educational content from top channels
- **💼 Professional**: Industry trends and technical discussions
- **🔬 Science**: Latest discoveries and explanations
- **💻 Development**: Programming tutorials and best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

- OpenAI for GPT API
- YouTube and Reddit for content APIs
- All the amazing content creators and communities

---

**Built with ❤️ for content enthusiasts who want quality over quantity.**