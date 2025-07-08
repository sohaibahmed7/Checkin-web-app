// Frontend Configuration
const config = {
    // API Configuration
    API_BASE_URL: 'https://api-3ffpwchysq-uc.a.run.app',
    API_ENDPOINTS: {
        PINGS: '/api/pings',
        USERS: '/api/user',
        CHAT: '/api/chat',
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        LOGOUT: '/api/logout',
        NEIGHBORHOOD: '/api/user/neighborhood',
        VALIDATE_INVITE: '/api/validate-invite-code',
        VERIFY_EMAIL: '/api/verify-email',
        RESEND_CODE: '/api/resend-code',
        CONTACT: '/api/contact',
        REQUEST_PASSWORD_RESET: '/api/request-password-reset',
        RESET_PASSWORD: '/api/reset-password',
        // Enhanced Reports API endpoints
        REPORTS: '/api/reports',
        REPORT_STATUS: '/api/reports',
        REPORT_NOTE: '/api/reports',
        REPORT_FOLLOW_UP: '/api/reports',
        REPORT_TRAIL: '/api/reports',
        PING_PHOTO: '/api/ping'
    },

    // Mapbox Configuration
    MAPBOX_ACCESS_TOKEN: 'pk.eyJ1IjoiYW5zaG1ha2thciIsImEiOiJjbTl2ams5OGcwbGwwMm1vbGpiaDduczg1In0.4yzUyxSxV9lHLtbRQfjdWA',
    
    // Socket.IO Configuration
    SOCKET_URL: 'http://localhost:3000',
    
    
    // App Configuration
    APP_NAME: 'CheckIn',
    APP_VERSION: '1.0.0',
    
    // Default Values
    DEFAULT_AVATAR: 'assets/avatar.svg',
    
    // Helper function to get full API URL
    getApiUrl: function(endpoint, id = null) {
        let url = this.API_BASE_URL + endpoint;
        if (id) {
            url += '/' + id;
        }
        return url;
    },
    
    // Helper function to get user profile picture URL
    getUserAvatarUrl: function(userId) {
        return userId ? this.getApiUrl(`/api/user/${userId}/profile-picture`) : this.DEFAULT_AVATAR;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} 