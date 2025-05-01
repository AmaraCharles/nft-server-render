// Handle file preview for single artwork upload
function initSingleArtworkPreview() {
    const artworkInput = document.getElementById('nftImage');
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    const previewAudio = document.getElementById('previewAudio');
    const placeholder = document.querySelector('.preview-placeholder');

    artworkInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Hide placeholder
                placeholder.style.display = 'none';
                
                // Hide all preview elements first
                previewImage.classList.add('d-none');
                previewVideo.classList.add('d-none');
                previewAudio.classList.add('d-none');

                // Show appropriate preview based on file type
                if (file.type.startsWith('image/')) {
                    previewImage.src = e.target.result;
                    previewImage.classList.remove('d-none');
                } else if (file.type.startsWith('video/')) {
                    previewVideo.src = e.target.result;
                    previewVideo.classList.remove('d-none');
                } else if (file.type.startsWith('audio/')) {
                    previewAudio.src = e.target.result;
                    previewAudio.classList.remove('d-none');
                }
            };
            reader.readAsDataURL(file);
        } else {
            // Show placeholder if no file selected
            placeholder.style.display = 'block';
            previewImage.classList.add('d-none');
            previewVideo.classList.add('d-none');
            previewAudio.classList.add('d-none');
        }
    });
}

// Handle file preview for collection upload
function initCollectionPreview() {
    const artworksInput = document.getElementById('artworks');
    const previewContainer = document.getElementById('collectionPreview');

    artworksInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'preview-item';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                previewDiv.appendChild(img);
                previewContainer.appendChild(previewDiv);
            };
            reader.readAsDataURL(file);
        });
    });
}

// Handle single artwork form submission
function initSingleArtworkForm() {
    const form = document.getElementById('createNFTForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();

        formData.append('title', form.nftName.value);
        formData.append('description', form.nftDescription.value);
        formData.append('price', form.nftPrice.value);
        formData.append('artwork', form.nftImage.files[0]);

        // Log form data and endpoint
        console.log('Single Artwork Form Data:', Object.fromEntries(formData));
        console.log('Single Artwork Endpoint:', 'https://nft-server-render.onrender.com/api/nfts/upload');

        try {
            const response = await fetch('/api/nfts/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            alert('Artwork uploaded successfully!');
            form.reset();
            document.getElementById('nftPreview').style.display = 'none';
        } catch (error) {
            console.error('Error uploading artwork:', error);
            alert('Failed to upload artwork. Please try again.');
        }
    });
}

// Handle collection form submission
function initCollectionForm() {
    const form = document.getElementById('collectionForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();

        formData.append('name', form.collectionName.value);
        formData.append('description', form.collectionDescription.value);

        Array.from(form.artworks.files).forEach((file, index) => {
            formData.append('artworks', file);
        });

        // Log form data and endpoint
        console.log('Collection Form Data:', Object.fromEntries(formData));
        console.log('Collection Endpoint:', 'https://nft-server-render.onrender.com/api/nfts/upload-collection');

        try {
            const response = await fetch('/api/nfts/upload-collection', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Collection upload failed');
            }

            const result = await response.json();
            alert('Collection uploaded successfully!');
            form.reset();
            document.getElementById('collectionPreview').innerHTML = '';
        } catch (error) {
            console.error('Error uploading collection:', error);
            alert('Failed to upload collection. Please try again.');
        }
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initSingleArtworkPreview();
    initCollectionPreview();
    initSingleArtworkForm();
    initCollectionForm();
});