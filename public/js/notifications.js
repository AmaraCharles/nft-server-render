// Notification system for NFT marketplace
class NotificationSystem {
    constructor() {
        this.notificationContainer = this.createNotificationContainer();
        this.notifications = [];
        this.initializeWebSocket();
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    initializeWebSocket() {
        this.ws = new WebSocket(window.location.origin.replace(/^http/, 'ws'));
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleNotification(data);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed. Retrying in 5 seconds...');
            setTimeout(() => this.initializeWebSocket(), 5000);
        };
    }

    handleNotification(data) {
        switch(data.type) {
            case 'bid':
                this.showNotification({
                    title: 'New Bid',
                    message: `New bid of ${data.amount} ETH on ${data.nftTitle}`,
                    type: 'info'
                });
                break;
            case 'purchase':
                this.showNotification({
                    title: 'NFT Purchased',
                    message: `${data.nftTitle} has been purchased for ${data.amount} ETH`,
                    type: 'success'
                });
                break;
            case 'auction_end':
                this.showNotification({
                    title: 'Auction Ended',
                    message: `Auction for ${data.nftTitle} has ended`,
                    type: 'warning'
                });
                break;
            case 'outbid':
                this.showNotification({
                    title: 'Outbid Alert',
                    message: `You have been outbid on ${data.nftTitle}`,
                    type: 'alert'
                });
                break;
        }
    }

    showNotification({ title, message, type = 'info' }) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <h4>${title}</h4>
            <p>${message}</p>
            <button class="notification-close">×</button>
        `;

        // Add close button functionality
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.classList.add('notification-fade-out');
            setTimeout(() => {
                this.notificationContainer.removeChild(notification);
                this.notifications = this.notifications.filter(n => n !== notification);
            }, 300);
        });

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode === this.notificationContainer) {
                notification.classList.add('notification-fade-out');
                setTimeout(() => {
                    this.notificationContainer.removeChild(notification);
                    this.notifications = this.notifications.filter(n => n !== notification);
                }, 300);
            }
        }, 5000);

        this.notifications.push(notification);
        this.notificationContainer.appendChild(notification);
    }

    // Method to manually trigger a notification (for testing)
    testNotification() {
        this.showNotification({
            title: 'Test Notification',
            message: 'This is a test notification',
            type: 'info'
        });
    }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
});