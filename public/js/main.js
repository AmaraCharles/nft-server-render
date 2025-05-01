// Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '🌓';
    document.body.appendChild(themeToggle);

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Initialize featured artworks section
function initFeaturedArtworks() {
    const featuredArtworks = document.getElementById('featuredArtworks');
    if (featuredArtworks) {
        // Sample featured artworks data
        const artworks = [
            { title: 'Digital Dreams', artist: 'CryptoArtist', price: '0.5 ETH', image: './images/artwork1.jpg' },
            { title: 'Abstract Future', artist: 'NFTCreator', price: '0.8 ETH', image: './images/artwork2.jpg' },
            { title: 'Pixel Paradise', artist: 'DigitalMaster', price: '0.3 ETH', image: './images/artwork3.jpg' }
        ];

        artworks.forEach(artwork => {
            const card = document.createElement('div');
            card.className = 'artwork-card';
            card.innerHTML = `
                <img src="${artwork.image}" alt="${artwork.title}" onerror="this.src='./images/placeholder.jpg'">
                <h3>${artwork.title}</h3>
                <p>By ${artwork.artist}</p>
                <p class="price">${artwork.price}</p>
                <button class="btn btn-primary">Buy Now</button>
            `;
            featuredArtworks.appendChild(card);
        });
    }
}

// Initialize live auctions section
function initLiveAuctions() {
    const liveAuctions = document.getElementById('liveAuctions');
    if (liveAuctions) {
        // Sample auctions data
        const auctions = [
            { title: 'Cosmic Collection', artist: 'GalaxyArt', currentBid: '1.2 ETH', endTime: '2h 15m', image: './images/auction1.jpg' },
            { title: 'Meta Masterpiece', artist: 'VirtualVision', currentBid: '0.9 ETH', endTime: '5h 30m', image: './images/auction2.jpg' },
            { title: 'Digital Dynasty', artist: 'CryptoKing', currentBid: '2.0 ETH', endTime: '1h 45m', image: './images/auction3.jpg' }
        ];

        auctions.forEach(auction => {
            const card = document.createElement('div');
            card.className = 'auction-card';
            card.innerHTML = `
                <img src="${auction.image}" alt="${auction.title}" onerror="this.src='./images/placeholder.jpg'">
                <h3>${auction.title}</h3>
                <p>By ${auction.artist}</p>
                <p class="current-bid">Current Bid: ${auction.currentBid}</p>
                <p class="end-time">Ends in: ${auction.endTime}</p>
                <button class="btn btn-secondary">Place Bid</button>
            `;
            liveAuctions.appendChild(card);
        });
    }
}

// Initialize wallet connection
function initWalletConnection() {
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            try {
                // Check if MetaMask is installed
                if (typeof window.ethereum !== 'undefined') {
                    // Request account access
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    connectWalletBtn.textContent = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
                } else {
                    alert('Please install MetaMask to connect your wallet!');
                }
            } catch (error) {
                console.error('Error connecting wallet:', error);
                alert('Failed to connect wallet. Please try again.');
            }
        });
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initFeaturedArtworks();
    initLiveAuctions();
    initWalletConnection();
});

function initCreateNFTForm() {
    const createNFTForm = document.getElementById('createNFTForm');
    const propertiesContainer = document.getElementById('propertiesContainer');
    const addPropertyBtn = document.getElementById('addProperty');

    if (addPropertyBtn) {
        addPropertyBtn.addEventListener('click', () => {
            const propertyRow = document.createElement('div');
            propertyRow.className = 'property-row d-flex mb-2';
            propertyRow.innerHTML = `
                <input type="text" placeholder="Property name" class="form-control me-2 property-name">
                <input type="text" placeholder="Property value" class="form-control me-2 property-value">
                <button type="button" class="btn btn-danger remove-property">Remove</button>
            `;
            propertiesContainer.appendChild(propertyRow);

            propertyRow.querySelector('.remove-property').addEventListener('click', () => {
                propertyRow.remove();
            });
        });
    }

    if (createNFTForm) {
        createNFTForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();

            // Add file
            const fileInput = document.getElementById('nftImage');
            if (fileInput.files.length > 0) {
                formData.append('image', fileInput.files[0]);
            }

            // Add basic NFT details
            formData.append('name', document.getElementById('nftName').value);
            formData.append('description', document.getElementById('nftDescription').value);
            formData.append('collection', document.getElementById('nftCollection').value);
            formData.append('price', document.getElementById('nftPrice').value);
            formData.append('currency', document.getElementById('nftCurrency').value);
            formData.append('royalties', document.getElementById('nftRoyalties').value);

            // Add properties
            const properties = [];
            document.querySelectorAll('.property-row').forEach(row => {
                const name = row.querySelector('.property-name').value;
                const value = row.querySelector('.property-value').value;
                if (name && value) {
                    properties.push({ name, value });
                }
            });
            formData.append('properties', JSON.stringify(properties));

            try {
                const submitButton = createNFTForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.innerHTML = 'Creating...';

                const response = await fetch('/api/nfts/create', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                alert('NFT created successfully!');
                createNFTForm.reset();
                
                // Clear properties
                while (propertiesContainer.firstChild) {
                    propertiesContainer.removeChild(propertiesContainer.firstChild);
                }
                // Add one empty property row
                addPropertyBtn.click();

            } catch (error) {
                console.error('Error creating NFT:', error);
                alert('Failed to create NFT. Please try again.');
            } finally {
                const submitButton = createNFTForm.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Create NFT';
            }
        });
    }
}