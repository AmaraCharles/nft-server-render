// User profile and NFT collection management
let userNFTs = [];
let userBalance = 0;

// Fetch user's NFT collection from the server
async function fetchUserNFTs() {
    try {
        const response = await fetch('/api/user/nfts');
        const data = await response.json();
        userNFTs = data.nfts;
        displayUserNFTs();
    } catch (error) {
        console.error('Error fetching user NFTs:', error);
    }
}

// Fetch user balance
async function fetchUserBalance() {
    try {
        const response = await fetch('/api/user/balance');
        const data = await response.json();
        userBalance = data.balance;
        updateBalanceDisplay();
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

// Update balance display
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `${userBalance} ETH`;
    }
}

// Display user's NFT collection
function displayUserNFTs() {
    const grid = document.getElementById('userNFTGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    if (userNFTs.length === 0) {
        grid.innerHTML = '<p class="no-nfts">You haven\'t purchased any NFTs yet.</p>';
        return;
    }

    userNFTs.forEach(nft => {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.innerHTML = `
            <div class="nft-image">
                <img src="${nft.image}" alt="${nft.title}">
            </div>
            <div class="nft-info">
                <h3 class="nft-title">${nft.title}</h3>
                <p class="nft-creator">Created by <span>${nft.creator}</span></p>
                <div class="nft-price">
                    <div class="price-eth">${nft.price} ETH</div>
                    <div class="price-usd">$${(nft.price * 2000).toFixed(2)}</div>
                </div>
                <div class="nft-actions">
                    <button class="btn btn-secondary list-btn" data-nft-id="${nft.id}">List for Sale</button>
                </div>
            </div>
        `;

        // Add event listener for listing NFT
        const listBtn = card.querySelector('.list-btn');
        listBtn.addEventListener('click', () => {
            showListingModal(nft);
        });

        grid.appendChild(card);
    });
}

// Show modal for listing NFT
function showListingModal(nft) {
    const modal = document.getElementById('listingModal');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.innerHTML = `
        <h2>List NFT for Sale</h2>
        <p>Title: ${nft.title}</p>
        <div class="form-group">
            <label for="listingPrice">Price (ETH)</label>
            <input type="number" id="listingPrice" min="0" step="0.001" value="${nft.price}">
        </div>
        <div class="modal-buttons">
            <button class="btn btn-primary" id="confirmListing">List NFT</button>
            <button class="btn btn-secondary close-btn">Cancel</button>
        </div>
    `;

    modal.style.display = 'block';

    // Handle listing confirmation
    document.getElementById('confirmListing').onclick = async () => {
        const price = parseFloat(document.getElementById('listingPrice').value);
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid price');
            return;
        }

        try {
            const response = await fetch('/api/nft/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nftId: nft.id,
                    price: price
                })
            });

            if (response.ok) {
                modal.style.display = 'none';
                alert('NFT listed successfully!');
                fetchUserNFTs(); // Refresh the display
            } else {
                throw new Error('Listing failed');
            }
        } catch (error) {
            console.error('Error listing NFT:', error);
            alert('Failed to list NFT. Please try again.');
        }
    };

    // Close modal functionality
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Initialize profile functionality
document.addEventListener('DOMContentLoaded', () => {
    fetchUserBalance();
    fetchUserNFTs();
});