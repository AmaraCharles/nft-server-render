// User balance and NFT ownership management
let userBalance = 0;
let userNFTs = [];

// Fetch user balance from the server
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

// Update balance display in the UI
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `Balance: ${userBalance} ETH`;
    }
}

// Initialize purchase modal functionality
function initPurchaseModal() {
    const modal = document.getElementById('purchaseModal');
    const closeBtn = modal.querySelector('.close-btn');
    let currentNFT = null;

    // Close modal when clicking the close button or outside the modal
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Handle buy button clicks
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-btn')) {
            const nftCard = e.target.closest('.nft-card');
            if (!nftCard) return;

            currentNFT = {
                id: nftCard.dataset.nftId,
                title: nftCard.querySelector('.nft-title').textContent,
                price: parseFloat(nftCard.querySelector('.price-eth').textContent),
                creator: nftCard.querySelector('.nft-creator span').textContent
            };

            // Check if user has sufficient balance
            if (userBalance < currentNFT.price) {
                alert('Insufficient balance to purchase this NFT');
                return;
            }

            // Show purchase confirmation modal
            const modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <h2>Confirm Purchase</h2>
                <p>Title: ${currentNFT.title}</p>
                <p>Price: ${currentNFT.price} ETH</p>
                <p>Creator: ${currentNFT.creator}</p>
                <p>Your Balance: ${userBalance} ETH</p>
                <p>Remaining Balance After Purchase: ${(userBalance - currentNFT.price).toFixed(4)} ETH</p>
                <div class="modal-buttons">
                    <button class="btn btn-primary" id="confirmPurchase">Confirm Purchase</button>
                    <button class="btn btn-secondary close-btn">Cancel</button>
                </div>
            `;

            modal.style.display = 'block';

            // Handle purchase confirmation
            document.getElementById('confirmPurchase').onclick = async () => {
                try {
                    const response = await fetch('/api/nft/purchase', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            nftId: currentNFT.id,
                            price: currentNFT.price
                        })
                    });

                    if (response.ok) {
                        // Update user balance
                        userBalance -= currentNFT.price;
                        updateBalanceDisplay();

                        // Add NFT to user's collection
                        userNFTs.push(currentNFT);

                        // Update UI
                        modal.style.display = 'none';
                        alert('NFT purchased successfully!');
                        
                        // Refresh the marketplace display
                        loadNFTs();
                    } else {
                        throw new Error('Purchase failed');
                    }
                } catch (error) {
                    console.error('Error purchasing NFT:', error);
                    alert('Failed to purchase NFT. Please try again.');
                }
            };
        }
    });
}

// Load NFTs in the marketplace
async function loadNFTs() {
    try {
        const response = await fetch('/api/nfts');
        const nfts = await response.json();
        displayNFTs(nfts);
    } catch (error) {
        console.error('Error loading NFTs:', error);
    }
}

// Display NFTs in the grid
function displayNFTs(nfts) {
    const grid = document.getElementById('nftGrid');
    const template = document.getElementById('nftCardTemplate');

    grid.innerHTML = '';
    nfts.forEach(nft => {
        const card = template.content.cloneNode(true);
        const nftCard = card.querySelector('.nft-card');

        nftCard.dataset.nftId = nft.id;
        card.querySelector('img').src = nft.image;
        card.querySelector('.nft-title').textContent = nft.title;
        card.querySelector('.nft-creator span').textContent = nft.creator;
        card.querySelector('.price-eth').textContent = `${nft.price} ETH`;
        card.querySelector('.price-usd').textContent = `$${(nft.price * 2000).toFixed(2)}`;

        grid.appendChild(card);
    });
}

// Initialize marketplace functionality
document.addEventListener('DOMContentLoaded', () => {
    fetchUserBalance();
    initPurchaseModal();
    loadNFTs();
});