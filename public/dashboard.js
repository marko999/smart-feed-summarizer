// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentFilter = 'all';
        this.currentSort = 'score';
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initCategorySliders();
        this.initPreviewMode();
        this.loadData();
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshFeeds();
        });

        document.getElementById('empty-refresh-btn').addEventListener('click', () => {
            this.refreshFeeds();
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancel-settings').addEventListener('click', () => {
            this.hideSettings();
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Sort and search
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.setSort(e.target.value);
        });

        document.getElementById('search-input').addEventListener('input', (e) => {
            this.setSearch(e.target.value);
        });

        // Export
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Modal click outside to close
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') {
                this.hideSettings();
            }
        });
    }

    async loadData() {
        try {
            const response = await fetch('/api/summaries');
            const result = await response.json();
            
            this.data = result.summaries || [];
            this.updateStats();
            this.applyFilters();
            this.renderContent();
            
            if (this.data.length === 0) {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load content');
        }
    }

    async refreshFeeds() {
        this.showLoading();
        this.startProgressTracking();
        
        try {
            const response = await fetch('/api/collect', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                await this.loadData();
                this.showSuccess(`Collected ${result.totalItems} new items`);
            } else {
                this.showError(result.error || 'Failed to refresh feeds');
            }
        } catch (error) {
            console.error('Error refreshing feeds:', error);
            this.showError('Failed to refresh feeds');
        } finally {
            this.stopProgressTracking();
            this.hideLoading();
        }
    }

    startProgressTracking() {
        this.progressInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                
                if (status.isCollecting && status.progress) {
                    this.updateProgress(status.progress);
                } else if (!status.isCollecting) {
                    this.stopProgressTracking();
                }
            } catch (error) {
                console.error('Error fetching progress:', error);
            }
        }, 1000); // Update every second
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgress(progress) {
        const loadingElement = document.getElementById('loading');
        if (!loadingElement || loadingElement.style.display === 'none') return;

        const progressPercent = progress.totalSteps > 0 ? 
            Math.round((progress.completedSteps / progress.totalSteps) * 100) : 0;

        // Update loading content with progress
        const loadingContent = loadingElement.querySelector('.loading-content');
        if (loadingContent) {
            loadingContent.innerHTML = `
                <div class="spinner"></div>
                <h3>${progress.currentStep}</h3>
                <p>${progress.currentFeed}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text">${progress.completedSteps}/${progress.totalSteps} feeds processed (${progressPercent}%)</div>
                ${progress.details.length > 0 ? `
                    <div class="progress-details">
                        ${progress.details.slice(-3).map(detail => `<div class="progress-item">${detail}</div>`).join('')}
                    </div>
                ` : ''}
            `;
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.applyFilters();
        this.renderContent();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.applyFilters();
        this.renderContent();
    }

    setSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.applyFilters();
        this.renderContent();
    }

    applyFilters() {
        let filtered = [...this.data];
        
        // Apply type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(item => item.type === this.currentFilter);
        }
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(this.searchTerm) ||
                item.summary.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'score':
                    return (b.scoring?.totalScore || 0) - (a.scoring?.totalScore || 0);
                case 'date':
                    return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
                case 'engagement':
                    const aEngagement = a.viewCount || a.score || 0;
                    const bEngagement = b.viewCount || b.score || 0;
                    return bEngagement - aEngagement;
                default:
                    return 0;
            }
        });
        
        this.filteredData = filtered;
    }

    renderContent() {
        const youtubeItems = this.filteredData.filter(item => item.type === 'youtube');
        const redditItems = this.filteredData.filter(item => item.type === 'reddit');
        
        this.renderSection('youtube', youtubeItems);
        this.renderSection('reddit', redditItems);
        
        // Update section visibility
        document.getElementById('youtube-section').style.display = youtubeItems.length > 0 ? 'block' : 'none';
        document.getElementById('reddit-section').style.display = redditItems.length > 0 ? 'block' : 'none';
        
        // Show/hide empty state
        if (this.filteredData.length === 0 && this.data.length > 0) {
            this.showEmptyState('No items match your current filters.');
        } else if (this.filteredData.length > 0) {
            this.hideEmptyState();
        }
    }

    renderSection(type, items) {
        const grid = document.getElementById(`${type}-grid`);
        const count = document.getElementById(`${type}-count`);
        
        count.textContent = items.length;
        
        if (items.length === 0) {
            grid.innerHTML = '';
            return;
        }
        
        grid.innerHTML = items.map(item => this.createItemCard(item)).join('');
    }

    createItemCard(item) {
        const publishDate = new Date(item.publishedAt || item.createdAt);
        const timeAgo = this.getTimeAgo(publishDate);
        
        const scoreDisplay = item.scoring ? 
            `<div class="card-score">
                <span class="score-label">Score:</span>
                <span class="score-value">${item.scoring.totalScore}</span>
            </div>` : '';
        
        const metaItems = [];
        
        if (item.type === 'youtube') {
            metaItems.push(`<div class="meta-item">📺 ${item.channelName}</div>`);
            if (item.viewCount) metaItems.push(`<div class="meta-item">👁️ ${this.formatNumber(item.viewCount)}</div>`);
            if (item.duration) metaItems.push(`<div class="meta-item">⏱️ ${this.formatDuration(item.duration)}</div>`);
        } else if (item.type === 'reddit') {
            metaItems.push(`<div class="meta-item">📍 r/${item.subreddit}</div>`);
            if (item.score) metaItems.push(`<div class="meta-item">⬆️ ${this.formatNumber(item.score)}</div>`);
            if (item.commentCount) metaItems.push(`<div class="meta-item">💬 ${item.commentCount}</div>`);
        }
        
        metaItems.push(`<div class="meta-item">🕒 ${timeAgo}</div>`);
        
        const summaryMethodIcon = item.summaryMethod === 'ai' ? '🤖' : '📝';
        const summaryMethodClass = item.summaryMethod === 'ai' ? 'method-ai' : 'method-extractive';
        
        return `
            <div class="content-card" data-type="${item.type}">
                <div class="card-header">
                    <div class="card-type ${item.type}">
                        ${item.type === 'youtube' ? '🎥 YouTube' : '🔴 Reddit'}
                    </div>
                    ${scoreDisplay}
                </div>
                
                <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
                
                <div class="card-meta">
                    ${metaItems.join('')}
                </div>
                
                <div class="card-summary">
                    <div class="ai-summary">
                        <strong>📝 Summary:</strong>
                        ${this.escapeHtml(item.aiSummary || item.summary)}
                    </div>
                    ${item.audienceReaction || item.communitySentiment ? `
                        <div class="sentiment-analysis">
                            <strong>${item.type === 'youtube' ? '👥 Audience Reaction:' : '💭 Community Sentiment:'}</strong>
                            ${this.escapeHtml(item.audienceReaction || item.communitySentiment)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-footer">
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link">
                        🔗 View Source
                    </a>
                    <div class="summary-method ${summaryMethodClass}">
                        ${summaryMethodIcon} ${item.aiSummary ? 'Gemini AI' : (item.summaryMethod || 'auto')}
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalItems = this.data.length;
        const aiSummaries = this.data.filter(item => item.summaryMethod === 'ai').length;
        const lastUpdated = this.data.length > 0 ? 
            new Date(Math.max(...this.data.map(item => new Date(item.timestamp || Date.now())))).toLocaleString() :
            'Never';
        
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('ai-summaries').textContent = aiSummaries;
        document.getElementById('last-updated').textContent = lastUpdated;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.querySelector('.main-content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.querySelector('.main-content').style.display = 'block';
    }

    showEmptyState(message = 'No content available') {
        const emptyState = document.getElementById('empty-state');
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = message;
    }

    hideEmptyState() {
        document.getElementById('empty-state').style.display = 'none';
    }

    showSettings() {
        document.getElementById('settings-modal').style.display = 'flex';
    }

    hideSettings() {
        document.getElementById('settings-modal').style.display = 'none';
    }

    async saveSettings() {
        try {
            // Save content distribution settings
            const distribution = this.saveContentDistribution();
            const success = await this.applyContentDistribution(distribution);
            
            if (success) {
                this.hideSettings();
                this.showSuccess('Settings saved successfully! Feed weights have been updated.');
            } else {
                this.showError('Failed to save content distribution settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    exportData() {
        const dataToExport = {
            exportDate: new Date().toISOString(),
            totalItems: this.data.length,
            items: this.data.map(item => ({
                title: item.title,
                url: item.url,
                type: item.type,
                summary: item.summary,
                score: item.scoring?.totalScore,
                publishedAt: item.publishedAt || item.createdAt,
                source: item.type === 'youtube' ? item.channelName : `r/${item.subreddit}`
            }))
        };
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feed-summaries-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Data exported successfully');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatDuration(duration) {
        // Parse PT4M13S format
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return duration;
        
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    // Category distribution settings
    initCategorySliders() {
        const categories = [
            { id: "aiml", name: "AI/ML", default: 5 },
            { id: "tech", name: "Technology", default: 2 },
            { id: "science", name: "Science/Math", default: 1 },
            { id: "culture", name: "Culture/Entertainment", default: 3 },
            { id: "business", name: "Business/Economics", default: 3 },
            { id: "news", name: "News/Media", default: 3 },
            { id: "technical", name: "Technical Specialties", default: 2 }
        ];

        categories.forEach(category => {
            const slider = document.getElementById(`${category.id}-slider`);
            const valueDisplay = document.getElementById(`${category.id}-value`);

            if (slider && valueDisplay) {
                slider.addEventListener("input", () => {
                    valueDisplay.textContent = slider.value;
                    this.updateTotalSummaries();
                });
                
                // Load saved value or use default
                const savedValue = localStorage.getItem(`category-${category.id}`) || category.default;
                slider.value = savedValue;
                valueDisplay.textContent = savedValue;
            }
        });

        // Reset defaults button
        document.getElementById("reset-defaults").addEventListener("click", () => {
            categories.forEach(category => {
                const slider = document.getElementById(`${category.id}-slider`);
                const valueDisplay = document.getElementById(`${category.id}-value`);
                
                if (slider && valueDisplay) {
                    slider.value = category.default;
                    valueDisplay.textContent = category.default;
                }
            });
            this.updateTotalSummaries();
        });

        this.updateTotalSummaries();
    }

    updateTotalSummaries() {
        const categories = ["aiml", "tech", "science", "culture", "business", "news", "technical"];
        let total = 0;
        
        categories.forEach(category => {
            const slider = document.getElementById(`${category}-slider`);
            if (slider) {
                total += parseInt(slider.value);
            }
        });
        
        document.getElementById("total-summaries").textContent = total;
    }

    saveContentDistribution() {
        const distribution = {};
        const categories = ["aiml", "tech", "science", "culture", "business", "news", "technical"];
        
        categories.forEach(category => {
            const slider = document.getElementById(`${category}-slider`);
            if (slider) {
                distribution[category] = parseInt(slider.value);
                localStorage.setItem(`category-${category}`, slider.value);
            }
        });
        
        return distribution;
    }

    async applyContentDistribution(distribution) {
        try {
            const response = await fetch("/api/content-distribution", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ distribution })
            });

            if (response.ok) {
                console.log("Content distribution updated successfully");
                return true;
            } else {
                console.error("Failed to update content distribution");
                return false;
            }
        } catch (error) {
            console.error("Error updating content distribution:", error);
            return false;
        }
    }

    // Preview mode functionality
    initPreviewMode() {
        // Preview button
        document.getElementById("preview-btn").addEventListener("click", () => {
            this.startPreviewMode();
        });

        // Close preview modal
        document.getElementById("close-preview").addEventListener("click", () => {
            this.hidePreviewModal();
        });

        document.getElementById("cancel-preview").addEventListener("click", () => {
            this.hidePreviewModal();
        });

        // Preview modal click outside to close
        document.getElementById("preview-modal").addEventListener("click", (e) => {
            if (e.target.id === "preview-modal") {
                this.hidePreviewModal();
            }
        });

        // Preview filters
        document.querySelectorAll(".preview-filter").forEach(filter => {
            filter.addEventListener("click", (e) => {
                this.setPreviewFilter(e.target.dataset.category);
            });
        });

        // Selection actions
        document.getElementById("select-all-btn").addEventListener("click", () => {
            this.selectAllVisible();
        });

        document.getElementById("clear-selection-btn").addEventListener("click", () => {
            this.clearSelection();
        });

        document.getElementById("auto-select-btn").addEventListener("click", () => {
            this.autoSelectContent();
        });

        // Summarize selected
        document.getElementById("summarize-selected").addEventListener("click", () => {
            this.summarizeSelected();
        });
    }

    async startPreviewMode() {
        try {
            this.showPreviewModal();
            this.showPreviewLoading();

            console.log("🔍 Starting preview collection...");
            const response = await fetch("/api/collect-previews", { method: "POST" });
            const result = await response.json();

            if (result.success) {
                this.previewData = result.previews;
                this.previewStats = result.stats;
                this.currentPreviewFilter = "all";
                this.selectedItems = new Set();

                this.updatePreviewStats();
                this.updatePreviewFilters();
                this.renderPreviewContent();
                this.hidePreviewLoading();

                console.log(`✅ Preview loaded: ${result.stats.totalItems} items`);
            } else {
                this.hidePreviewLoading();
                this.showError("Failed to load preview content: " + result.error);
            }
        } catch (error) {
            this.hidePreviewLoading();
            this.showError("Error loading preview content: " + error.message);
            console.error("Preview error:", error);
        }
    }

    showPreviewModal() {
        document.getElementById("preview-modal").style.display = "flex";
    }

    hidePreviewModal() {
        document.getElementById("preview-modal").style.display = "none";
        // Reset preview data
        this.previewData = null;
        this.selectedItems = new Set();
    }

    showPreviewLoading() {
        document.getElementById("preview-loading").style.display = "block";
        document.getElementById("preview-grid").style.display = "none";
        document.getElementById("preview-empty").style.display = "none";
    }

    hidePreviewLoading() {
        document.getElementById("preview-loading").style.display = "none";
        document.getElementById("preview-grid").style.display = "grid";
    }

    updatePreviewStats() {
        if (!this.previewStats) return;

        document.getElementById("preview-total").textContent = this.previewStats.totalItems;
        document.getElementById("preview-selected").textContent = this.selectedItems.size;
    }

    updatePreviewFilters() {
        if (!this.previewStats) return;

        // Update filter counts
        document.querySelector(`[data-category="all"] .count`).textContent = this.previewStats.totalItems;

        Object.entries(this.previewStats.categories).forEach(([category, count]) => {
            const filter = document.querySelector(`[data-category="${category}"] .count`);
            if (filter) {
                filter.textContent = count;
            }
        });
    }

    setPreviewFilter(category) {
        this.currentPreviewFilter = category;

        // Update active filter
        document.querySelectorAll(".preview-filter").forEach(filter => {
            filter.classList.remove("active");
        });
        document.querySelector(`[data-category="${category}"]`).classList.add("active");

        this.renderPreviewContent();
    }

    renderPreviewContent() {
        if (!this.previewData) return;

        const allItems = [...this.previewData.youtube, ...this.previewData.reddit];
        let filteredItems = allItems;

        // Apply category filter
        if (this.currentPreviewFilter !== "all") {
            filteredItems = allItems.filter(item => item.category === this.currentPreviewFilter);
        }

        // Sort by datetime (freshest first)
        filteredItems.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));

        const grid = document.getElementById("preview-grid");
        const empty = document.getElementById("preview-empty");

        if (filteredItems.length === 0) {
            grid.style.display = "none";
            empty.style.display = "block";
            return;
        }

        empty.style.display = "none";
        grid.style.display = "grid";
        grid.innerHTML = filteredItems.map(item => this.createPreviewItem(item)).join("");

        // Add click handlers
        document.querySelectorAll(".preview-item").forEach((element, index) => {
            const item = filteredItems[index];
            element.addEventListener("click", () => {
                this.toggleItemSelection(item, element);
            });
        });
    }

    createPreviewItem(item) {
        const isSelected = this.selectedItems.has(item.id);
        const thumbnail = item.thumbnail || (item.type === "youtube" ? "🎥" : "📝");
        const source = item.type === "youtube" ? item.channelName : `r/${item.subreddit}`;
        const publishDate = new Date(item.publishedAt || item.createdAt);
        const timeAgo = this.getTimeAgo(publishDate);
        const dateString = publishDate.toLocaleDateString() + ' ' + publishDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        return `
            <div class="preview-item ${isSelected ? "selected" : ""}" data-id="${item.id}">
                ${item.thumbnail ? 
                    `<img src="${item.thumbnail}" alt="Thumbnail" class="preview-thumbnail">` :
                    `<div class="preview-thumbnail placeholder">${item.type === "youtube" ? "🎥" : "📝"}</div>`
                }
                
                <div class="preview-title">${this.escapeHtml(item.title)}</div>
                
                <div class="preview-meta">
                    <span class="preview-source">${source}</span>
                    <span class="preview-freshness freshness-${item.freshness}">${timeAgo}</span>
                </div>
                
                ${item.description ? `<div class="preview-description">${this.escapeHtml(item.description)}</div>` : ""}
                
                <div class="preview-footer">
                    <span class="preview-category">${item.category}</span>
                    <span class="preview-datetime" title="${dateString}">${dateString}</span>
                </div>
            </div>
        `;
    }

    toggleItemSelection(item, element) {
        if (this.selectedItems.has(item.id)) {
            this.selectedItems.delete(item.id);
            element.classList.remove("selected");
        } else {
            this.selectedItems.add(item.id);
            element.classList.add("selected");
        }

        this.updateSelectionUI();
    }

    selectAllVisible() {
        document.querySelectorAll(".preview-item:not(.selected)").forEach(element => {
            const itemId = element.dataset.id;
            this.selectedItems.add(itemId);
            element.classList.add("selected");
        });

        this.updateSelectionUI();
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll(".preview-item.selected").forEach(element => {
            element.classList.remove("selected");
        });

        this.updateSelectionUI();
    }

    autoSelectContent() {
        // Smart selection based on user preferences and content distribution
        const distribution = this.loadContentDistribution();
        const allItems = [...this.previewData.youtube, ...this.previewData.reddit];
        
        // Group by category
        const itemsByCategory = {};
        allItems.forEach(item => {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });

        // Sort each category by score and select top items based on distribution
        const categoryMap = {
            "AI/ML": "aiml",
            "Technology": "tech", 
            "Science/Math": "science",
            "Culture/Entertainment": "culture",
            "Business/Economics": "business",
            "News/Media": "news",
            "Technical Specialties": "technical"
        };

        this.clearSelection();

        Object.entries(itemsByCategory).forEach(([category, items]) => {
            const distKey = categoryMap[category];
            const targetCount = distribution[distKey] || 1;
            
            // Sort by score and take top items
            items.sort((a, b) => (b.previewScore || 0) - (a.previewScore || 0));
            const selectedFromCategory = items.slice(0, Math.min(targetCount, items.length));
            
            selectedFromCategory.forEach(item => {
                this.selectedItems.add(item.id);
            });
        });

        // Update UI
        document.querySelectorAll(".preview-item").forEach(element => {
            const itemId = element.dataset.id;
            if (this.selectedItems.has(itemId)) {
                element.classList.add("selected");
            }
        });

        this.updateSelectionUI();
        this.showSuccess(`Smart selection applied: ${this.selectedItems.size} items selected based on your preferences`);
    }

    updateSelectionUI() {
        const count = this.selectedItems.size;
        
        // Update counters
        document.getElementById("preview-selected").textContent = count;
        document.getElementById("selected-count").textContent = count;
        
        // Update button states
        const summarizeBtn = document.getElementById("summarize-selected");
        summarizeBtn.disabled = count === 0;
        
        // Update summary text
        const summaryEl = document.getElementById("selection-summary");
        if (count === 0) {
            summaryEl.textContent = "No items selected";
        } else {
            // Count by category
            const allItems = [...this.previewData.youtube, ...this.previewData.reddit];
            const selectedItemsData = allItems.filter(item => this.selectedItems.has(item.id));
            const categoryCount = {};
            
            selectedItemsData.forEach(item => {
                categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
            });
            
            const categoryText = Object.entries(categoryCount)
                .map(([cat, cnt]) => `${cat}: ${cnt}`)
                .join(", ");
                
            summaryEl.textContent = `${count} selected (${categoryText})`;
        }
    }

    async summarizeSelected() {
        if (this.selectedItems.size === 0) {
            this.showError("Please select at least one item to summarize");
            return;
        }

        try {
            // Get selected items data
            const allItems = [...this.previewData.youtube, ...this.previewData.reddit];
            const selectedItemsData = allItems.filter(item => this.selectedItems.has(item.id));

            console.log(`📝 Starting summarization of ${selectedItemsData.length} items...`);

            // Hide preview modal
            this.hidePreviewModal();
            
            // Show main loading
            this.showLoading();
            this.startProgressTracking();

            const response = await fetch("/api/summarize-selected", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ selectedItems: selectedItemsData })
            });

            const result = await response.json();

            if (result.success) {
                this.data = result.summaries;
                this.updateStats();
                this.applyFilters();
                this.renderContent();
                
                this.showSuccess(`Successfully summarized ${result.totalItems} items!`);
            } else {
                this.showError("Summarization failed: " + result.error);
            }

        } catch (error) {
            console.error("Error summarizing selected items:", error);
            this.showError("Error during summarization: " + error.message);
        } finally {
            this.stopProgressTracking();
            this.hideLoading();
        }
    }

    loadContentDistribution() {
        // Load saved distribution settings or use defaults
        const categories = ["aiml", "tech", "science", "culture", "business", "news", "technical"];
        const distribution = {};
        
        categories.forEach(category => {
            const savedValue = localStorage.getItem(`category-${category}`);
            distribution[category] = savedValue ? parseInt(savedValue) : this.getDefaultDistribution()[category];
        });
        
        return distribution;
    }

    getDefaultDistribution() {
        return {
            aiml: 5,
            tech: 2,
            science: 1,
            culture: 3,
            business: 3,
            news: 3,
            technical: 2
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
