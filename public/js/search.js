// Search and filter functionality for the NFT marketplace
const searchConfig = {
    filters: {
        price: { min: 0, max: null },
        category: 'all',
        status: 'all'
    },
    sortBy: 'newest'
};

class NFTSearch {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.filterForm = document.getElementById('filterForm');
        this.resultsContainer = document.getElementById('searchResults');
        this.initializeSearchUI();
        this.setupEventListeners();
    }

    initializeSearchUI() {
        // Create filter form if it doesn't exist
        if (!this.filterForm) {
            this.filterForm = document.createElement('form');
            this.filterForm.id = 'filterForm';
            this.filterForm.className = 'filter-form';
            this.filterForm.innerHTML = `
                <div class="filter-group">
                    <label for="priceMin">Min Price (ETH)</label>
                    <input type="number" id="priceMin" min="0" step="0.01">
                </div>
                <div class="filter-group">
                    <label for="priceMax">Max Price (ETH)</label>
                    <input type="number" id="priceMax" min="0" step="0.01">
                </div>
                <div class="filter-group">
                    <label for="category">Category</label>
                    <select id="category">
                        <option value="all">All Categories</option>
                        <option value="art">Art</option>
                        <option value="collectibles">Collectibles</option>
                        <option value="gaming">Gaming</option>
                        <option value="music">Music</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="status">Status</label>
                    <select id="status">
                        <option value="all">All Status</option>
                        <option value="sale">On Sale</option>
                        <option value="auction">On Auction</option>
                        <option value="sold">Sold</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="sortBy">Sort By</label>
                    <select id="sortBy">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="priceAsc">Price: Low to High</option>
                        <option value="priceDesc">Price: High to Low</option>
                    </select>
                </div>
            `;
            document.querySelector('.marketplace-filters').appendChild(this.filterForm);
        }
    }

    setupEventListeners() {
        // Debounce search input
        let searchTimeout;
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
        });

        // Handle filter changes
        this.filterForm?.addEventListener('change', (e) => {
            const { id, value } = e.target;
            switch(id) {
                case 'priceMin':
                case 'priceMax':
                    searchConfig.filters.price[id === 'priceMin' ? 'min' : 'max'] = value ? parseFloat(value) : null;
                    break;
                case 'category':
                    searchConfig.filters.category = value;
                    break;
                case 'status':
                    searchConfig.filters.status = value;
                    break;
                case 'sortBy':
                    searchConfig.sortBy = value;
                    break;
            }
            this.handleSearch();
        });
    }

    async handleSearch(query = '') {
        try {
            const response = await fetch('https://nft-server-render.onrender.com/api/nfts/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    filters: searchConfig.filters,
                    sortBy: searchConfig.sortBy
                })
            });

            const results = await response.json();
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.displayError('Failed to fetch search results');
        }
    }

    displayResults(results) {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = '';
        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<p class="no-results">No NFTs found matching your criteria</p>';
            return;
        }

        results.forEach(nft => {
            const card = document.createElement('div');
            card.className = 'nft-card';
            card.innerHTML = `
                <img src="${nft.image}" alt="${nft.title}" onerror="this.src='./images/placeholder.jpg'">
                <div class="nft-info">
                    <h3>${nft.title}</h3>
                    <p>By ${nft.artist}</p>
                    <p class="price">${nft.price} ETH</p>
                    <p class="status">${nft.status}</p>
                    <button class="btn btn-primary">${nft.status === 'auction' ? 'Place Bid' : 'Buy Now'}</button>
                </div>
            `;
            this.resultsContainer.appendChild(card);
        });
    }

    displayError(message) {
        if (!this.resultsContainer) return;
        this.resultsContainer.innerHTML = `<p class="error-message">${message}</p>`;
    }
}

// Initialize search functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.marketplace-container')) {
        new NFTSearch();
    }
});