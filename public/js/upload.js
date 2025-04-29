// Handle file preview for single artwork upload
function initSingleArtworkPreview() {
    const artworkInput = document.getElementById('artwork');
    const preview = document.getElementById('artworkPreview');

    artworkInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
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
    const form = document.getElementById('singleArtworkForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();

        formData.append('title', form.title.value);
        formData.append('description', form.description.value);
        formData.append('price', form.price.value);
        formData.append('artwork', form.artwork.files[0]);

        try {
            const response = await fetch('https://nft-server-render.onrender.com/api/nfts/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            alert('Artwork uploaded successfully!');
            form.reset();
            document.getElementById('artworkPreview').style.display = 'none';
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

        try {
            const response = await fetch('https://nft-server-render.onrender.com/api/nfts/upload-collection', {
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