let map = null;
let liveMap = null;
let userMarker = null;
let selectedPingLocation = null; // Variable to store selected location {lat, lng}
let tempPingMarker = null; // Variable to hold the temporary marker
let pingMapPreview = null; // Variable to hold the modal map instance (moved to top-level)
let allPings = []; // Array to store all fetched pings
let activityChart = null; // Global variable to track the activity chart instance
let pendingFlyTo = null; // Store flyTo target if switching tabs
let reportsActivityChart = null;

window.addEventListener('pageshow', () => {
    if (!localStorage.getItem('user')) {
        window.location.href = '/pages/auth/login.html';
    }
});

// Global function to create a modern ping marker
function createModernPingMarker(ping, targetMap) {
    const el = document.createElement('div');
    el.className = `marker ${ping.type}`;
    el.innerHTML = getPingTypeIcon(ping.type);
    
    // Determine if this is the home map or live map
    const isHomeMap = targetMap && targetMap.getContainer && targetMap.getContainer().id === 'map';

    // Create popup with timestamp, user, and image indicator
    let userName = 'Community User';
    if (ping.user) {
        if (ping.user.name) {
            userName = ping.user.name;
        } else if (ping.user.firstName && ping.user.lastName) {
            userName = `${ping.user.firstName} ${ping.user.lastName}`;
        } else if (ping.user.firstName) {
            userName = ping.user.firstName;
        }
    }
    let metaLine = `By ${userName}, ${formatTimestamp(ping.timestamp)}`;
    let imageIndicator = ping.photo_url ? '<span class="ping-image-indicator-top"><i class="fas fa-image"></i></span>' : '';
    
    // Only show photo in popup if not on the home map
    let photoHtml = '';
    if (ping.photo_url && !isHomeMap) {
        photoHtml = `<div class="ping-photo"><img src="${ping.photo_url}" alt="Ping Photo" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 10px; margin-top: 8px; display: block;"></div>`;
    }
    
    const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true,
    }).setHTML(`
        <div class=\"ping-tooltip\">\n            ${imageIndicator}\n            <span class=\"ping-category ${ping.type}\">${formatPingTypeDisplay(ping.type)}</span>\n            <p class=\"ping-message\">${ping.description}</p>\n            ${photoHtml}\n            <div class=\"ping-meta-line\">${metaLine}</div>\n        </div>\n    `);

    // Create and return the marker
    const marker = new mapboxgl.Marker(el)
        .setLngLat(ping.coordinates)
        .setPopup(popup)
        .addTo(targetMap);
    
    return marker;
}

// Global function to format timestamps
function formatTimestamp(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

// Global function to format ping type for display
function formatPingTypeDisplay(type) {
    switch(type) {
        case 'suspicious': return 'Suspicious';
        case 'break-enter': return 'Break & Enter';
        case 'fire': return 'Fire';
        case 'other': return 'Other';
        default: return 'Other';
    }
}

// Global function to update map markers
function updateMapMarkers(targetMap, pingsList = allPings, category = 'all') {
    if (!targetMap) return;
    if (targetMap._markers) {
        targetMap._markers.forEach(marker => marker.remove());
    }
    targetMap._markers = [];
    pingsList.forEach(ping => {
        if (ping.coordinates && typeof ping.coordinates[0] === 'number' && typeof ping.coordinates[1] === 'number') {
            // Only add marker if it matches the category or if 'all' is selected
            if (category === 'all' || ping.type === category) {
                const marker = createModernPingMarker(ping, targetMap);
                targetMap._markers.push(marker);
            }
        }
    });
}

// Global function to render pings
async function renderPings(pingsToRender, containerId = 'recent-updates-container') {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const container = document.getElementById(containerId) || document.querySelector(`.${containerId}`);
    if (!container) return;

    // Only show the 3 most recent pings in the updates section
    let pingsToDisplay = pingsToRender;
    if (containerId === 'recent-updates-container') {
        pingsToDisplay = pingsToRender.slice(0, 3);
    }

    container.innerHTML = '';

    if (pingsToDisplay.length === 0) {
        container.innerHTML = '<p class="no-pings-message">No recent pings to display.</p>';
        return;
    }

    pingsToDisplay.forEach(ping => {
        const pingUser = ping.user;
        // Robust user name handling for all user shapes
        let userName = 'Community User';
        if (pingUser) {
            if (pingUser.name) {
                userName = pingUser.name;
            } else if (pingUser.firstName && pingUser.lastName) {
                userName = `${pingUser.firstName} ${pingUser.lastName}`;
            } else if (pingUser.firstName) {
                userName = pingUser.firstName;
            }
        }
        let userAvatar = config.getUserAvatarUrl(pingUser && pingUser._id ? pingUser._id : null);
        const pingTypeIcon = getPingTypeIcon(ping.type);
        const pingTypeLabel = formatPingTypeDisplay(ping.type);
        
        // Handle photo display - only show image if not in the home tab preview
        let photoHtml = '';
        if (ping.photo_url) {
            photoHtml = `<div class="ping-photo"><img src="${ping.photo_url}" alt="Ping Photo" style="width: 80%; max-height: 200px; object-fit: cover; border-radius: 10px; margin-top: 8px; display: block;"></div>`;
        }
        
        const pingElement = document.createElement('div');
        pingElement.className = 'feed-item';
        pingElement.innerHTML = `
            <div class="feed-avatar">
                <img src="${userAvatar}" alt="Profile Picture" onerror="this.onerror=null;this.src='${config.DEFAULT_AVATAR}';">
            </div>
            <div class="feed-content">
                <div class="feed-header feed-header-flex">
                    <span class="feed-user"><strong>${userName}</strong></span>
                    <div class="feed-meta-right">
                        <span class="feed-time">${formatTimestamp(ping.timestamp)}</span>
                        <span class="ping-type-icon">${pingTypeIcon} <span class="ping-type-label">${pingTypeLabel}</span></span>
                    </div>
                </div>
                <p class="feed-text">${ping.description || ''}</p>
                ${photoHtml}
                <div class="feed-actions">
                    <a href="#" class="view-on-map" data-lat="${ping.coordinates ? ping.coordinates[1] : ''}" data-lng="${ping.coordinates ? ping.coordinates[0] : ''}">View on Map</a>
                    ${isAdmin ? `<button class="delete-ping-btn" data-ping-id="${ping.id}"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(pingElement);
    });

    // Add event listeners for "View on Map" links (only for newly added links)
    container.querySelectorAll('.view-on-map').forEach(link => {
        if (!link.dataset.listenerAdded) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const lat = parseFloat(this.getAttribute('data-lat'));
                const lng = parseFloat(this.getAttribute('data-lng'));
                if (!isNaN(lat) && !isNaN(lng)) {
                    const isLiveMapActive = document.getElementById('live-map').classList.contains('active');
                    if (isLiveMapActive && liveMap) {
                        liveMap.flyTo({ center: [lng, lat], zoom: 18, essential: true });
                        setTimeout(() => openPingPopupOnLiveMap(lng, lat), 500);
                    } else {
                        pendingFlyTo = { lng, lat, showPopup: true };
                        document.querySelector('a[data-tab="live-map"]').click();
                    }
                } else {
                    alert('Location not available for this ping.');
                }
            });
            link.dataset.listenerAdded = 'true';
        }
    });

    // Add delete handler
    if (isAdmin) {
        container.querySelectorAll('.delete-ping-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (!confirm('Are you sure you want to delete this ping? This action cannot be undone.')) return;
                const pingId = this.getAttribute('data-ping-id');
                try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const res = await fetch(config.getApiUrl(`/api/pings/${pingId}`), {
                        method: 'DELETE',
                        headers: { 'x-user-id': user._id }
                    });
                    if (res.ok) {
                        alert('Ping deleted successfully.');
                        await fetchPings();
                    } else {
                        alert('Failed to delete ping.');
                    }
                } catch {
                    alert('Error deleting ping.');
                }
            });
        });
    }
}

// Global function to fetch pings from the backend
async function fetchPings() {
    try {
        // Get the user's neighborhoodId
        const user = JSON.parse(localStorage.getItem('user'));
        let neighborhoodId = null;
        if (user && user._id) {
            const nRes = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.NEIGHBORHOOD}/${user._id}`));
            if (nRes.ok) {
                const neighborhood = await nRes.json();
                if (neighborhood && neighborhood._id) {
                    neighborhoodId = neighborhood._id;
                }
            }
        }
        const response = await fetch(
            neighborhoodId
                ? config.getApiUrl(`${config.API_ENDPOINTS.PINGS}?neighborhoodId=${neighborhoodId}`)
                : config.getApiUrl(config.API_ENDPOINTS.PINGS)
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pings = await response.json();
        console.log('Fetched raw pings from backend:', pings); // Debugging: log raw fetched pings
        
        allPings = pings.map(ping => {
            console.log('Processing raw ping:', ping); // Log each raw ping being processed
            // Ensure coordinates are an array of two numbers [lng, lat], or null if invalid
            const coordinates = ping.location && typeof ping.location.lat === 'number' && typeof ping.location.lng === 'number'
                ? [ping.location.lng, ping.location.lat] // Mapbox expects [lng, lat]
                : null; // Assign null if coordinates are invalid

            if (coordinates === null || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
                console.warn('Ping has invalid or missing coordinates, but will still be processed for display:', ping);
                // Do NOT return null here; let the ping pass through with null coordinates
            }
            console.log('Parsed coordinates for ping:', coordinates); // Log parsed coordinates

            return {
                id: ping._id,
                type: ping.type || 'other', // Default to 'other' if type is not provided by backend
                description: ping.description,
                coordinates: coordinates, // Ensure this is [lng, lat] or null
                timestamp: new Date(ping.createdAt), // Use createdAt for timestamp
                photo_url: ping.photo_url, // Include photo_url if available
                user: ping.user // <-- Add this line to include user info
            };
        });

        console.log('Processed pings (allPings):', allPings); // Debugging: log processed pings

        // Get current filter states and apply them to the newly fetched data
        const homeCategoryEl = document.querySelector('.map-section .category-toggles button.active');
        const homeCategory = homeCategoryEl ? homeCategoryEl.getAttribute('data-category') : 'all';
        const homeTimeFilterEl = document.querySelector('.map-section .time-filter');
        const homeTime = homeTimeFilterEl ? homeTimeFilterEl.value : 'all';
        const homeFiltered = filterPings(homeCategory, homeTime);

        const fullCategoryEl = document.querySelector('#map .map-filters-left .category-filter.active');
        const fullCategory = fullCategoryEl ? fullCategoryEl.getAttribute('data-category') : 'all';
        const fullTimeFilterEl = document.querySelector('#map .map-filters-right .time-filter');
        const fullTime = fullTimeFilterEl ? fullTimeFilterEl.value : 'all';
        const fullFiltered = filterPings(fullCategory, fullTime);

        const liveCategoryEl = document.querySelector('#live-map .category-toggles button.active');
        const liveCategory = liveCategoryEl ? liveCategoryEl.getAttribute('data-category') : 'all';
        const liveTimeFilterEl = document.querySelector('#live-map .time-filter');
        const liveTime = liveTimeFilterEl ? liveTimeFilterEl.value : 'all';
        const liveFiltered = filterPings(liveCategory, liveTime);

        // Update maps with filtered data instead of all pings
        updatePingsFeed(homeFiltered); // Display filtered pings initially
        updateMapMarkers(map, homeFiltered, homeCategory);       // Update home map with filtered data
        updatePingsFeed(liveFiltered, 'ping-details-container');
        updateMapMarkers(liveMap, liveFiltered, liveCategory);   // Update live map with filtered data

        // Reset current displayed pings and render for new data
        currentPingsDisplayed = 0;
        // Initialize the activity chart only after pings are loaded
        initializeActivityChart();

        // In fetchPings, after allPings is updated, call renderRecentActivityFeed if reports tab is visible
        if (document.querySelector('.tab-pane#reports').classList.contains('active')) {
            renderRecentActivityFeed();
        }
    } catch (error) {
        console.error('Error fetching pings:', error);
    }
}

// Global function to filter pings based on category and time range
function filterPings(category, timeRange) {
    let filtered = allPings;

    if (category !== 'all') {
        filtered = filtered.filter(ping => ping.type === category);
    }

    const now = new Date();
    if (timeRange === '24h') {
        filtered = filtered.filter(ping => (now - ping.timestamp) < 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
        filtered = filtered.filter(ping => (now - ping.timestamp) < 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
        filtered = filtered.filter(ping => (now - ping.timestamp) < 30 * 24 * 60 * 60 * 1000);
    }

    return filtered;
}

// Global function to update pings feed
function updatePingsFeed(filteredPings) {
    console.log('updatePingsFeed received for filtering:', filteredPings.length, 'pings');
    // This function will now apply the time and category filters, then trigger rendering
    currentPingsDisplayed = 0; // Reset pagination for new filter
    renderPings(filteredPings); // Render the filtered subset
}

// Global function to initialize activity chart
function initializeActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Destroy existing chart instance if it exists
    if (activityChart) {
        activityChart.destroy();
        activityChart = null;
    }

    // Show the last 7 days, with today on the right
    const daysToShow = 7;
    const dates = Array.from({length: daysToShow}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (daysToShow - 1 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const alerts = Array.from({length: daysToShow}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (daysToShow - 1 - i));
        return allPings.filter(ping => {
            let pingDate = ping.timestamp instanceof Date ? ping.timestamp : new Date(ping.timestamp);
            return isSameDay(pingDate, d);
        }).length;
    });

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Alerts',
                data: alerts,
                borderColor: '#6b21a8',
                backgroundColor: 'rgba(107, 33, 168, 0.08)',
                borderWidth: 2,
                pointBackgroundColor: '#6b21a8',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#111827',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => {
                            return items[0].label;
                        },
                        label: (item) => {
                            return `${item.formattedValue} alerts`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#666',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#eee'
                    },
                    ticks: {
                        color: '#666'
                    }
                }
            }
        }
    });

    // Update chart for different periods (daily, weekly, monthly)
    document.querySelectorAll('.chart-filters button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.chart-filters button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const period = this.getAttribute('data-period');
            updateChartStats(period);
        });
    });

    function updateChartStats(period) {
        if (!activityChart) return; // Guard against null chart
        
        let daysToDisplay;
        switch(period) {
            case 'daily': daysToDisplay = 1; break;
            case 'weekly': daysToDisplay = 7; break;
            case 'monthly': daysToDisplay = 30; break;
            default: daysToDisplay = 7;
        }

        const newDates = Array.from({length: daysToDisplay}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (daysToDisplay - 1 - i));
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const newAlerts = Array.from({length: daysToDisplay}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (daysToDisplay - 1 - i));
            return allPings.filter(ping => {
                let pingDate = ping.timestamp instanceof Date ? ping.timestamp : new Date(ping.timestamp);
                return isSameDay(pingDate, d);
            }).length;
        });

        activityChart.data.labels = newDates;
        activityChart.data.datasets[0].data = newAlerts;
        activityChart.update();
    }
}

// Global function to destroy activity chart
function destroyActivityChart() {
    if (activityChart) {
        activityChart.destroy();
        activityChart = null;
    }
}

// Global function to clear all filters
function clearAllFilters() {
    // Clear category filters - set all to inactive and 'all' to active
    document.querySelectorAll('.category-toggles button, .category-filter').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === 'all') {
            btn.classList.add('active');
        }
    });

    // Clear time filters - set all to 'all' (All time)
    document.querySelectorAll('.time-filter').forEach(select => {
        select.value = 'all';
    });

    // Update maps with all pings (no filters)
    updateMapMarkers(map, allPings, 'all');
    updateMapMarkers(liveMap, allPings, 'all');

    // Update feed with all pings
    updatePingsFeed(allPings);
}

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve username from localStorage and update greeting
    const user = JSON.parse(localStorage.getItem('user'));
    const userName = user && user.firstName ? user.firstName : 'User';
    const greetingText = document.getElementById('greeting-text');
    if (greetingText) {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 18) {
            greeting = 'Good Afternoon';
        } else if (hour >= 18) {
            greeting = 'Good Evening';
        }
        greetingText.textContent = `${greeting}, ${userName}!`;
    }

    // Set greeting bar avatar immediately on load
    const greetingBarAvatar = document.getElementById('greetingBarAvatar');
    if (greetingBarAvatar && user && user._id) {
        let avatarUrl = config.getUserAvatarUrl(user._id);
        greetingBarAvatar.src = avatarUrl;
        greetingBarAvatar.onerror = function() { this.onerror = null; this.src = 'assets/avatar.svg'; };
    }

    // Initialize Mapbox with the correct token
    mapboxgl.accessToken = config.MAPBOX_ACCESS_TOKEN;
    
    // Add navigation handlers
    document.querySelectorAll('[data-navigate-to]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = element.getAttribute('data-navigate-to');
            const tabLink = document.querySelector(`a[data-tab="${targetTab}"]`);
            if (tabLink) {
                tabLink.click();
                // Scroll to top after switching tab
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        });
    });

    // London, ON coordinates (fallback)
    const start_x_coord = -81.24
    const start_y_coord = 43.02

    // Helper function to calculate the centroid of a polygon
    function getCentroid(coords) {
        let x = 0, y = 0, n = coords.length;
        coords.forEach(([lng, lat]) => {
            x += lng;
            y += lat;
        });
        return [x / n, y / n];
    }

    // Function to get neighborhood data and calculate center
    async function getNeighborhoodData() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) {
            console.log('No user data found, using default coordinates');
            return { center: [start_x_coord, start_y_coord], bounds: null };
        }
        try {
            const response = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.NEIGHBORHOOD}/${user._id}`));
            if (!response.ok) {
                console.log('No neighborhood found for user, using default coordinates');
                return { center: [start_x_coord, start_y_coord], bounds: null };
            }
            const neighborhood = await response.json();
            if (!neighborhood.bounds || !neighborhood.bounds.coordinates) {
                console.log('Neighborhood has no bounds, using default coordinates');
                return { center: [start_x_coord, start_y_coord], bounds: null };
            }
            // Calculate centroid from neighborhood bounds
            const coordinates = neighborhood.bounds.coordinates[0]; // First polygon ring
            const centroid = getCentroid(coordinates);
            return {
                center: centroid,
                bounds: coordinates
            };
        } catch (error) {
            console.error('Error fetching neighborhood data:', error);
            return { center: [start_x_coord, start_y_coord], bounds: null };
        }
    }

    // Helper function to get bounding box from polygon coordinates
    function getBoundingBox(coords) {
        let minLng = coords[0][0], maxLng = coords[0][0];
        let minLat = coords[0][1], maxLat = coords[0][1];
        coords.forEach(([lng, lat]) => {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        });
        return [[minLng, minLat], [maxLng, maxLat]];
    }

    // Helper function to calculate the minimum zoom that fits the bounds
    function getMinZoomForBounds(map, bounds) {
        // Mapbox GL JS fitBounds returns the zoom level that fits the bounds
        // We'll use a temporary fitBounds call to get the zoom
        const options = { padding: 0, linear: true }; // No padding for strict fit
        map.fitBounds(bounds, { ...options, animate: false });
        return map.getZoom();
    }

    // Initialize home page map
    async function initializeHomeMap() {
        const homeMapContainer = document.getElementById('map');
        if (!homeMapContainer) return;
        if (map) map.remove();
        const neighborhoodData = await getNeighborhoodData();
        let mapOptions = {
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: neighborhoodData.center,
            zoom: 13
        };
        let bounds;
        if (neighborhoodData.bounds) {
            bounds = getBoundingBox(neighborhoodData.bounds);
            mapOptions.maxBounds = bounds;
        }
        map = new mapboxgl.Map(mapOptions);
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.addControl(new mapboxgl.NavigationControl());
        if (bounds) {
            map.on('load', () => {
                map.fitBounds(bounds, { padding: 0, animate: false });
                // Calculate minZoom that fits the bounds
                const minZoom = map.getZoom();
                map.setMinZoom(minZoom);
                map.setMaxZoom(20); // Allow zooming in, but not out past bounds
            });
        }
        // The markers will be added by fetchPings and updateMapMarkers
    }

    // Initialize live map
    async function initializeLiveMap() {
        const liveMapContainer = document.getElementById('live-map-full');
        console.log('Live map container:', liveMapContainer); // Debug
        if (!liveMapContainer) {
            console.error('Live map container not found!');
            return;
        }
        
        if (liveMap) {
            console.log('Removing existing live map');
            liveMap.remove();
        }
        
        try {
            const neighborhoodData = await getNeighborhoodData();
            console.log('Neighborhood data for live map:', neighborhoodData);
            
            let mapOptions = {
                container: 'live-map-full',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: neighborhoodData.center,
                zoom: 13
            };
            let bounds;
            if (neighborhoodData.bounds) {
                bounds = getBoundingBox(neighborhoodData.bounds);
                mapOptions.maxBounds = bounds;
            }
            
            console.log('Creating live map with options:', mapOptions);
            liveMap = new mapboxgl.Map(mapOptions);
            
            // Enable zoom controls for live map
            liveMap.scrollZoom.enable();
            liveMap.touchZoomRotate.enable();
            liveMap.addControl(new mapboxgl.NavigationControl());
            
            if (bounds) {
                liveMap.on('load', () => {
                    console.log('Live map loaded, fitting bounds');
                    liveMap.fitBounds(bounds, { padding: 0, animate: false });
                    const minZoom = liveMap.getZoom();
                    liveMap.setMinZoom(minZoom);
                    liveMap.setMaxZoom(20);
                });
            }
            
            console.log('Live map initialized successfully');
            // The markers will be added by fetchPings and updateMapMarkers
        } catch (error) {
            console.error('Error initializing live map:', error);
        }
    }

    // Greeting messages for each tab
    const tabGreetings = {
        home: {
            greeting: (userName, time) => `👋🏼 ${time}, ${userName}!`,
            subtitle: 'Welcome back to your dashboard'
        },
        'live-map': {
            greeting: () => '🗺️ Welcome to your Neighbourhood Map!',
            subtitle: 'See live updates and activity in your area'
        },
        chat: {
            greeting: () => '💬 Community Chat',
            subtitle: 'Connect and communicate with your neighbors'
        },
        reports: {
            greeting: () => '📑 Reports Overview',
            subtitle: 'View and manage all reports here'
        },
        contacts: {
            greeting: () => '🔑 Key Contacts',
            subtitle: 'Important contacts for your community'
        },
        settings: {
            greeting: () => '⚙️ Settings',
            subtitle: 'Manage your account and preferences'
        }
    };

    function updateGreetingForTab(tab) {
        const greetingText = document.getElementById('greeting-text');
        const subtitle = greetingText && greetingText.nextElementSibling;
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Handle the new user structure with firstName/lastName
        let userName = user && user.firstName ? user.firstName : 'User';

        const hour = new Date().getHours();
        let time = 'Good Morning';
        if (hour >= 12 && hour < 18) {
            time = 'Good Afternoon';
        } else if (hour >= 18) {
            time = 'Good Evening';
        }
        const config = tabGreetings[tab] || tabGreetings['home'];
        if (greetingText) greetingText.textContent = typeof config.greeting === 'function' ? config.greeting(userName, time) : config.greeting;
        if (subtitle) subtitle.textContent = config.subtitle;
    }

    // Tab switching logic
    const tabs = document.querySelectorAll('.tab-pane');
    const tabLinks = document.querySelectorAll('.sidebar-nav a');

    tabLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetTab = link.getAttribute('data-tab');

            tabs.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            tabLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Update greeting for the selected tab
            updateGreetingForTab(targetTab);

            // Clear all filters when switching tabs
            clearAllFilters();

            // Load user settings when settings tab is clicked
            if (targetTab === 'settings') {
                loadUserSettings();
            }

            // Re-initialize maps only if not already initialized
            if (targetTab === 'home') {
                await initializeHomeMap();
                updateMapMarkers(map);
                fetchPings();
                // Optionally render pings for home tab if needed
            } else if (targetTab === 'live-map') {
                await initializeLiveMap();
                updateMapMarkers(liveMap);
                fetchPings();
                setTimeout(() => {
                    if (document.getElementById('ping-details-container')) {
                        renderPings(allPings, 'ping-details-container');
                    }
                    // If there is a pending flyTo, do it now
                    if (pendingFlyTo && liveMap) {
                        liveMap.flyTo({ center: [pendingFlyTo.lng, pendingFlyTo.lat], zoom: 18, essential: true });
                        if (pendingFlyTo.showPopup) {
                            setTimeout(() => openPingPopupOnLiveMap(pendingFlyTo.lng, pendingFlyTo.lat), 500);
                        }
                        pendingFlyTo = null;
                    }
                }, 100);
            }

            // Push a new dummy state for back button modal
            history.pushState({ dashboard: true, tab: targetTab }, '', location.href); // Modified to include tab info

            // Scroll to top after switching tab
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    });

    // Set greeting on initial load
    updateGreetingForTab('home');

    // Add save settings handler
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveUserSettings);
    }

    // Activate default tab on load (e.g., home tab)
    document.querySelector('.sidebar-nav a[data-tab="home"]').click();

    // Initial fetch of pings on page load
    fetchPings();

    // Add event listener for window resize
    window.addEventListener('resize', () => {
        if (map) map.resize();
        if (liveMap) liveMap.resize();
    });

    // Modify the ping form submission to also update the feed immediately
    const pingForm = document.getElementById('pingForm');
    if (pingForm) {
        pingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!selectedPingLocation) {
                alert('Please select a location on the map.');
                return;
            }
            const description = document.getElementById('pingDescription').value;
            const category = document.getElementById('pingCategory').value;
            const lat = selectedPingLocation.lat;
            const lng = selectedPingLocation.lng;
            const photoInput = document.getElementById('pingPhoto');
            const photo = photoInput && photoInput.files.length > 0 ? photoInput.files[0] : null;
            // Get userId from the user object in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user && user._id ? user._id : null;
            
            // Convert photo to base64 if provided
            let photo_base64 = null;
            if (photo) {
                photo_base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(photo);
                });
            }
            
            const requestData = {
                description: description,
                type: category,
                lat: lat,
                lng: lng,
                userId: userId
            };
            
            if (photo_base64) {
                requestData.photo_base64 = photo_base64;
            }
            
            try {
                const response = await fetch(config.getApiUrl(config.API_ENDPOINTS.PINGS), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                if (response.ok) {
                    alert('Ping posted successfully!');
                    document.getElementById('placePingModal').classList.remove('active');
                    pingForm.reset();
                    selectedPingLocation = null;
                    if (tempPingMarker !== null) {
                        tempPingMarker.remove();
                        tempPingMarker = null;
                    }
                    fetchPings();
                } else {
                    const errorText = await response.text();
                    alert('Failed to post ping: ' + response.status + ' ' + response.statusText + (errorText ? ' - ' + errorText : ''));
                }
            } catch (err) {
                alert('Error posting ping: ' + err.message);
            }
        });
    }

    // Message actions
    const messageActions = document.querySelectorAll('.message-actions');
    messageActions.forEach(actions => {
        const replyButton = actions.querySelector('.action-btn.reply-btn');
        if (replyButton) {
            replyButton.addEventListener('click', () => {
                // Implement reply functionality
                console.log('Reply button clicked');
            });
        }

        const reactButton = actions.querySelector('.action-btn.react-btn');
        if (reactButton) {
            const onClick = (e) => {
                e.stopPropagation(); // Prevent message click from happening
                const emojiPicker = actions.querySelector('.emoji-picker');
                if (emojiPicker) {
                    emojiPicker.classList.toggle('active');
                }
            };
            // Ensure the listener is only added once
            if (!reactButton.dataset.listenerAdded) {
                reactButton.addEventListener('click', onClick);
                reactButton.dataset.listenerAdded = 'true';
            }
        }
    });

    // Click outside to close emoji picker
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-picker').forEach(picker => {
            if (!picker.contains(e.target) && !e.target.closest('.react-btn')) {
                picker.classList.remove('active');
            }
        });
    });

    // Emoji selection
    document.querySelectorAll('.emoji-btn').forEach(emojiButton => {
        if (!emojiButton.dataset.listenerAdded) {
            emojiButton.addEventListener('click', function() {
                const emoji = this.dataset.emoji;
                const messageElement = this.closest('.message');
                if (messageElement) {
                    addReaction(messageElement, emoji);
                    // Close the picker
                    this.closest('.emoji-picker').classList.remove('active');
                }
            });
            emojiButton.dataset.listenerAdded = 'true';
        }
    });

    function handleMessageAction(action, message) {
        console.log(`Action: ${action}, Message:`, message);
        // Implement specific actions (e.g., reply, react, delete)
    }

    function addReaction(message, emoji) {
        let reactionsContainer = message.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            message.querySelector('.message-content').appendChild(reactionsContainer);
        }

        let reactionBadge = reactionsContainer.querySelector(`.reaction-badge[data-emoji="${emoji}"]`);
        if (reactionBadge) {
            let count = parseInt(reactionBadge.dataset.count || '0');
            reactionBadge.dataset.count = count + 1;
            reactionBadge.querySelector('span').textContent = count + 1;
            // Toggle active state for current user's reaction
            reactionBadge.classList.toggle('active');
        } else {
            reactionBadge = document.createElement('div');
            reactionBadge.className = 'reaction-badge active'; // Mark as active for current user
            reactionBadge.dataset.emoji = emoji;
            reactionBadge.dataset.count = '1';
            reactionBadge.innerHTML = `${emoji} <span>1</span>`;
            reactionsContainer.appendChild(reactionBadge);
        }
    }

    // Chat functionality
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const chatId = this.dataset.chatId; // Assuming data-chat-id attribute is set
            updateChatWindow(chatId);
        });
    });

    // Initial chat window load (example)
    // updateChatWindow('general');

    // Place Ping Modal Logic
    const placePingBtnHome = document.getElementById('place-ping-fab-home');
    const placePingBtnLive = document.getElementById('place-ping-fab-live');
    const placePingModal = document.getElementById('placePingModal');
    const closePingModal = document.getElementById('closePingModal');
    const pingMapPreviewContainer = document.getElementById('pingMapPreview');
    const mapLocationInput = document.getElementById('pin-location');

    if (placePingBtnHome) {
        placePingBtnHome.addEventListener('click', () => {
            placePingModal.classList.add('active');
            // Initialize map inside modal when it opens
            setTimeout(initializePingMapPreview, 100); // Small delay to ensure modal is visible
        });
    }

    if (placePingBtnLive) {
        placePingBtnLive.addEventListener('click', () => {
            placePingModal.classList.add('active');
            setTimeout(initializePingMapPreview, 100);
        });
    }

    if (closePingModal) {
        closePingModal.addEventListener('click', () => {
            placePingModal.classList.remove('active');
            // Clear the temporary marker when closing the modal
            if (tempPingMarker) {
                tempPingMarker.remove();
                tempPingMarker = null;
            }
            selectedPingLocation = null; // Clear selected location
            if (mapLocationInput) {
                mapLocationInput.value = '';
            }
            if (pingMapPreview) {
                pingMapPreview.remove(); // Dispose of the map instance
                pingMapPreview = null;
            }
        });
    }

    function initializePingMapPreview() {
        const pingMapElement = document.getElementById('pingMapPreview');
        if (!pingMapElement) return;

        if (pingMapPreview) {
            pingMapPreview.remove(); // Remove existing map instance if any
            pingMapPreview = null;
        }

        // Use the same logic as other maps for neighborhood bounds and center
        (async () => {
            const neighborhoodData = await getNeighborhoodData();
            let mapOptions = {
                container: 'pingMapPreview',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: neighborhoodData.center,
                zoom: 13,
                interactive: true
            };
            let bounds;
            if (neighborhoodData.bounds) {
                bounds = getBoundingBox(neighborhoodData.bounds);
                mapOptions.maxBounds = bounds;
            }
            pingMapPreview = new mapboxgl.Map(mapOptions);
            pingMapPreview.scrollZoom.disable();
            pingMapPreview.touchZoomRotate.disable();
            pingMapPreview.addControl(new mapboxgl.NavigationControl());
            if (bounds) {
                pingMapPreview.on('load', () => {
                    pingMapPreview.fitBounds(bounds, { padding: 0, animate: false });
                    const minZoom = pingMapPreview.getZoom();
                    pingMapPreview.setMinZoom(minZoom);
                    pingMapPreview.setMaxZoom(20);
                });
            }

            pingMapPreview.on('click', (e) => {
                selectedPingLocation = {
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng
                };

                if (tempPingMarker) {
                    tempPingMarker.remove();
                }

                const el = document.createElement('div');
                el.className = 'marker preview';

                tempPingMarker = new mapboxgl.Marker(el)
                    .setLngLat(e.lngLat)
                    .addTo(pingMapPreview);

                document.getElementById('ping-lat').value = selectedPingLocation.lat;
                document.getElementById('ping-lng').value = selectedPingLocation.lng;
            });

            // Address search logic (binds only when modal is open)
            const pingAddressSearch = document.getElementById('pingAddressSearch');
            const pingAddressSuggestions = document.getElementById('pingAddressSuggestions');
            if (pingAddressSearch) {
                pingAddressSearch.value = '';
                pingAddressSuggestions.innerHTML = '';
                pingAddressSearch.oninput = debounce(async function() {
                    const query = this.value.trim();
                    if (query.length < 3) {
                        pingAddressSuggestions.innerHTML = '';
                        return;
                    }
                    const suggestions = await fetchAddressSuggestions(query);
                    renderSuggestions(suggestions);
                }, 350);
            }

            function renderSuggestions(suggestions) {
                pingAddressSuggestions.innerHTML = '';
                if (!suggestions.length) return;
                const list = document.createElement('ul');
                list.style.position = 'absolute';
                list.style.top = '100%';
                list.style.left = '0';
                list.style.right = '0';
                list.style.background = '#fff';
                list.style.border = '1px solid #eee';
                list.style.zIndex = '1000';
                list.style.listStyle = 'none';
                list.style.margin = '0';
                list.style.padding = '0';
                list.style.maxHeight = '180px';
                list.style.overflowY = 'auto';
                suggestions.forEach(feature => {
                    const item = document.createElement('li');
                    item.textContent = feature.place_name;
                    item.style.padding = '0.7rem 1rem';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #f0f0f0';
                    item.addEventListener('mousedown', () => {
                        // Center map and set marker
                        if (pingMapPreview) {
                            pingMapPreview.flyTo({ center: feature.center, zoom: 15 });
                            // Simulate a click to place marker
                            const lngLat = { lng: feature.center[0], lat: feature.center[1] };
                            selectedPingLocation = lngLat;
                            if (tempPingMarker) tempPingMarker.remove();
                            const el = document.createElement('div');
                            el.className = 'marker';
                            el.style.backgroundColor = 'var(--primary-color)';
                            el.style.width = '24px';
                            el.style.height = '24px';
                            el.style.borderRadius = '50%';
                            el.style.border = '2px solid white';
                            el.style.boxShadow = '0 0 0 2px var(--primary-color)';
                            tempPingMarker = new mapboxgl.Marker(el)
                                .setLngLat(lngLat)
                                .addTo(pingMapPreview);
                            document.getElementById('ping-lat').value = lngLat.lat;
                            document.getElementById('ping-lng').value = lngLat.lng;
                        }
                        pingAddressSearch.value = feature.place_name;
                        pingAddressSuggestions.innerHTML = '';
                    });
                    list.appendChild(item);
                });
                pingAddressSuggestions.appendChild(list);
            }
        })();
    }

    // Load settings when settings tab is clicked
    const settingsTab = document.querySelector('a[href="#settings"]');
    if (settingsTab) {
        settingsTab.addEventListener('click', loadUserSettings);
    }

    // Handle profile picture preview
    const profilePictureInput = document.getElementById('profilePicture');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.querySelector('.profile-preview-avatar img');
                    let avatarUrl = config.getUserAvatarUrl(user._id);
                    previewImg.src = e.target.result;
                    previewImg.onerror = function() { this.onerror = null; this.src = avatarUrl; };
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Settings functionality
    async function loadUserSettings() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            console.error('No user data found in localStorage');
            return;
        }

        // Update profile preview
        const profilePreviewAvatar = document.querySelector('.profile-preview-avatar img');
        const profilePreviewName = document.querySelector('.profile-preview-info h2');
        const profilePreviewEmail = document.querySelector('.profile-preview-info p');

        if (profilePreviewAvatar && user && user._id) {
            profilePreviewAvatar.src = config.getApiUrl(`/api/user/${user._id}/profile-picture`);
            profilePreviewAvatar.onerror = function() {
                this.onerror = null;
                this.src = config.DEFAULT_AVATAR;
            };
        }
        if (profilePreviewName) {
            profilePreviewName.textContent = user.name;
        }
        if (profilePreviewEmail) {
            profilePreviewEmail.textContent = user.email;
        }

        // Update form fields
        document.getElementById('email').value = user.email;
        document.getElementById('phone').value = user.phoneNumber;
        // Clear password fields
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        // Hide password section
        document.getElementById('changePasswordSection').style.display = 'none';
    }

    // Toggle password section
    const toggleChangePasswordBtn = document.getElementById('toggleChangePassword');
    if (toggleChangePasswordBtn) {
        toggleChangePasswordBtn.addEventListener('click', function() {
            const section = document.getElementById('changePasswordSection');
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Cancel button returns to home tab
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Switch to home tab
            document.querySelectorAll('.tab-pane').forEach(tabPane => {
                tabPane.classList.remove('active');
                if (tabPane.id === 'home') {
                    tabPane.classList.add('active');
                }
            });
            document.querySelectorAll('.sidebar-nav a').forEach(sidebarLink => {
                sidebarLink.classList.remove('active');
                if (sidebarLink.getAttribute('data-tab') === 'home') {
                    sidebarLink.classList.add('active');
                }
            });
        });
    }

    // Save button handler
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveUserSettings);
    }

    async function saveUserSettings(event) {
        if (event) event.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) {
            alert('No user data found. Please log in again.');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const profilePictureInput = document.getElementById('profilePicture');
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        let profilePictureBase64 = null;
        if (profilePictureInput.files && profilePictureInput.files[0]) {
            profilePictureBase64 = await toBase64(profilePictureInput.files[0]);
        }
        // Build payload
        const payload = {
            userId: user._id,
            email: emailInput.value,
            phoneNumber: phoneInput.value,
        };
        if (profilePictureBase64) payload.profile_picture_base64 = profilePictureBase64;
        const passwordFieldsFilled = oldPassword && newPassword && confirmNewPassword;
        if (passwordFieldsFilled) {
            payload.oldPassword = oldPassword;
            payload.newPassword = newPassword;
            payload.confirmNewPassword = confirmNewPassword;
        }
        try {
            const response = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.USERS}/settings`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok) {
                // If both email and password changed
                if (data.emailChanged && passwordFieldsFilled) {
                    alert('Email and password changed. Please check your new email for a verification code. After verifying, you will need to log in again.');
                    localStorage.removeItem('user');
                    window.location.href = '/pages/auth/verify-email.html';
                    return;
                }
                // If only email changed
                if (data.emailChanged) {
                    alert('Email changed. Please check your new email for a verification code. Use this code next time you log in.');
                    window.location.href = '/pages/auth/verify-email.html';
                    return;
                }
                // If only password changed
                if (passwordFieldsFilled) {
                    alert('Password changed. Please sign in again.');
                    localStorage.removeItem('user');
                    window.location.href = '/pages/auth/login.html';
                    return;
                }
                // Update localStorage with new user data
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                loadUserSettings();
                alert('Settings saved successfully!');
            } else {
                alert(data.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred while saving settings');
        }
    }

    // Helper to convert file to base64
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Handle alert links on the home tab
    document.querySelectorAll('.alert-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            if (!tab) return;
            // Activate the correct tab
            document.querySelectorAll('.tab-pane').forEach(tabPane => {
                tabPane.classList.remove('active');
                if (tabPane.id === tab) {
                    tabPane.classList.add('active');
                }
            });
            // Activate the correct sidebar link if present
            document.querySelectorAll('.sidebar-nav a').forEach(sidebarLink => {
                sidebarLink.classList.remove('active');
                if (sidebarLink.getAttribute('data-tab') === tab) {
                    sidebarLink.classList.add('active');
                }
            });
        });
    });

    // Add user dropdown menu handlers
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear all data from localStorage
            localStorage.clear();
            // Redirect to home page
            window.location.href = '../index.html';
        });
    }

    // Place Ping Modal Address Search Logic
    const pingAddressSearch = document.getElementById('pingAddressSearch');
    const pingAddressSuggestions = document.getElementById('pingAddressSuggestions');

    // Helper: Debounce
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Fetch suggestions from Mapbox
    async function fetchAddressSuggestions(query) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.features || [];
    }

    // Render suggestions dropdown
    function renderSuggestions(suggestions) {
        pingAddressSuggestions.innerHTML = '';
        if (!suggestions.length) return;
        const list = document.createElement('ul');
        list.style.position = 'absolute';
        list.style.top = '100%';
        list.style.left = '0';
        list.style.right = '0';
        list.style.background = '#fff';
        list.style.border = '1px solid #eee';
        list.style.zIndex = '1000';
        list.style.listStyle = 'none';
        list.style.margin = '0';
        list.style.padding = '0';
        list.style.maxHeight = '180px';
        list.style.overflowY = 'auto';
        suggestions.forEach(feature => {
            const item = document.createElement('li');
            item.textContent = feature.place_name;
            item.style.padding = '0.7rem 1rem';
            item.style.cursor = 'pointer';
            item.style.borderBottom = '1px solid #f0f0f0';
            item.addEventListener('mousedown', () => {
                // Center map and set marker
                if (pingMapPreview) {
                    pingMapPreview.flyTo({ center: feature.center, zoom: 15 });
                    // Simulate a click to place marker
                    const lngLat = { lng: feature.center[0], lat: feature.center[1] };
                    selectedPingLocation = lngLat;
                    if (tempPingMarker) tempPingMarker.remove();
                    const el = document.createElement('div');
                    el.className = 'marker';
                    el.style.backgroundColor = 'var(--primary-color)';
                    el.style.width = '24px';
                    el.style.height = '24px';
                    el.style.borderRadius = '50%';
                    el.style.border = '2px solid white';
                    el.style.boxShadow = '0 0 0 2px var(--primary-color)';
                    tempPingMarker = new mapboxgl.Marker(el)
                        .setLngLat(lngLat)
                        .addTo(pingMapPreview);
                    document.getElementById('ping-lat').value = lngLat.lat;
                    document.getElementById('ping-lng').value = lngLat.lng;
                }
                pingAddressSearch.value = feature.place_name;
                pingAddressSuggestions.innerHTML = '';
            });
            list.appendChild(item);
        });
        pingAddressSuggestions.appendChild(list);
    }

    if (pingAddressSearch) {
        pingAddressSearch.addEventListener('input', debounce(async function() {
            const query = this.value.trim();
            if (query.length < 3) {
                pingAddressSuggestions.innerHTML = '';
                return;
            }
            const suggestions = await fetchAddressSuggestions(query);
            renderSuggestions(suggestions);
        }, 350));
    }

    // Sign Out Modal Logic
    (function() {
        const modal = document.getElementById('signoutModal');
        const cancelBtn = document.getElementById('cancelSignoutBtn');
        const confirmBtn = document.getElementById('confirmSignoutBtn');
        let popstateTriggered = false;

        window.addEventListener('popstate', function(e) {
            // Only show modal if on dashboard and not already triggered
            if (!popstateTriggered && modal) {
                popstateTriggered = true;
                modal.classList.add('active');
                // Prevent navigation
                history.pushState({dashboard: true}, '', location.href);
            }
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                modal.classList.remove('active');
                popstateTriggered = false;
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
                // Call backend logout endpoint
                try {
                    await fetch(config.getApiUrl(config.API_ENDPOINTS.LOGOUT), { method: 'POST', credentials: 'include' });
                } catch (e) {
                    // Ignore errors for now
                }
                // Clear all data from localStorage
                localStorage.clear();
                // Redirect to login
                window.location.href = '/pages/auth/login.html';
            });
        }
    })();

    // Add Follow-up Modal: Toggle Suggestion/Evidence fields
    function updateFollowUpModalFields() {
        const suggestionFields = document.getElementById('suggestionFields');
        const evidenceFields = document.getElementById('evidenceFields');
        const typeRadios = document.querySelectorAll('input[name="followupType"]');
        let selectedType = 'suggestion';
        typeRadios.forEach(radio => {
            if (radio.checked) selectedType = radio.value;
        });
        if (selectedType === 'evidence') {
            suggestionFields.style.display = 'none';
            evidenceFields.style.display = '';
        } else {
            suggestionFields.style.display = '';
            evidenceFields.style.display = 'none';
        }
    }
    // Attach event listeners to radio buttons
    document.querySelectorAll('input[name="followupType"]').forEach(radio => {
        radio.addEventListener('change', updateFollowUpModalFields);
    });
    // Also update fields when modal is opened
    const addFollowUpModal = document.getElementById('addFollowUpModal');
    if (addFollowUpModal) {
        addFollowUpModal.addEventListener('transitionend', updateFollowUpModalFields);
        // Or, if you have a function that opens the modal, call updateFollowUpModalFields() there
    }
    // Initial call in case modal is already open
    updateFollowUpModalFields();

    // Add Follow-up Modal: Drag-and-drop and click-to-upload for evidence image
    const evidenceUploadArea = document.getElementById('evidenceUploadArea');
    const evidenceImageInput = document.getElementById('evidenceImage');
    const evidenceFilePreview = document.getElementById('evidenceFilePreview');
    if (evidenceUploadArea && evidenceImageInput && evidenceFilePreview) {
        // Click to upload
        evidenceUploadArea.addEventListener('click', function(e) {
            // Only trigger if not clicking on a file preview
            if (!e.target.classList.contains('file-preview')) {
                evidenceImageInput.click();
            }
        });
        // Drag and drop
        evidenceUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            evidenceUploadArea.classList.add('dragover');
        });
        evidenceUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            evidenceUploadArea.classList.remove('dragover');
        });
        evidenceUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            evidenceUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                evidenceImageInput.files = e.dataTransfer.files;
                showEvidenceFilePreview();
            }
        });
        // File input change
        evidenceImageInput.addEventListener('change', showEvidenceFilePreview);
        // Show preview
        function showEvidenceFilePreview() {
            const file = evidenceImageInput.files && evidenceImageInput.files[0];
            if (!file) {
                evidenceFilePreview.style.display = 'none';
                evidenceFilePreview.innerHTML = '';
                return;
            }
            evidenceFilePreview.style.display = 'block';
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    evidenceFilePreview.innerHTML = `<img src="${e.target.result}" alt="Preview"><span>${file.name}</span>`;
                };
                reader.readAsDataURL(file);
            } else {
                evidenceFilePreview.innerHTML = `<span>${file.name}</span>`;
            }
        }
    } 

    // Fix logout button in sidebar
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/pages/auth/login.html';
        });
    }

    // Fix cancel button for Place Ping modal
    const cancelPingBtn = document.getElementById('cancelPingBtn');
    if (cancelPingBtn && placePingModal) {
        cancelPingBtn.addEventListener('click', function() {
            placePingModal.classList.remove('active');
        });
    }

    // Show password toggle for settings
    const showSettingsPassword = document.getElementById('showSettingsPassword');
    const oldPasswordInput = document.getElementById('oldPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    if (showSettingsPassword && oldPasswordInput && newPasswordInput && confirmNewPasswordInput) {
        showSettingsPassword.addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            oldPasswordInput.type = type;
            newPasswordInput.type = type;
            confirmNewPasswordInput.type = type;
        });
    }

    // Notification bell dropdown logic
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationsDropdown');
    if (bell && dropdown) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // --- Reports Tab Activity Chart ---
    function initializeReportsActivityChart() {
        const ctx = document.getElementById('reportsActivityChart');
        if (!ctx) return;
        if (reportsActivityChart) {
            reportsActivityChart.destroy();
            reportsActivityChart = null;
        }
        // Default to 7 days (Week)
        renderReportsChart('week');
        // Add filter button listeners
        document.querySelectorAll('.activity-chart-section .chart-filters button').forEach((btn, idx) => {
            btn.onclick = function() {
                document.querySelectorAll('.activity-chart-section .chart-filters button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const period = btn.textContent.trim().toLowerCase();
                renderReportsChart(period);
            };
        });
        // Add listeners for new breakdown filters
        const typeFilter = document.getElementById('chart-type-filter');
        const statusFilter = document.getElementById('chart-status-filter');
        if (typeFilter) typeFilter.addEventListener('change', () => {
            const period = document.querySelector('.activity-chart-section .chart-filters button.active')?.textContent.trim().toLowerCase() || 'week';
            renderReportsChart(period);
        });
        if (statusFilter) statusFilter.addEventListener('change', () => {
            const period = document.querySelector('.activity-chart-section .chart-filters button.active')?.textContent.trim().toLowerCase() || 'week';
            renderReportsChart(period);
        });
    }

    function renderReportsChart(period) {
        const ctx = document.getElementById('reportsActivityChart');
        if (!ctx) return;
        if (reportsActivityChart) {
            reportsActivityChart.destroy();
            reportsActivityChart = null;
        }
        // Get filter values
        const typeFilter = document.getElementById('chart-type-filter');
        const statusFilter = document.getElementById('chart-status-filter');
        const selectedType = typeFilter ? typeFilter.value : 'all';
        const selectedStatus = statusFilter ? statusFilter.value : 'all';
        let daysToShow = 7;
        if (period === 'month') daysToShow = 30;
        if (period === 'year') daysToShow = 365;
        let labels = [];
        let data = [];
        let periodStart = new Date();
        if (period === 'year') {
            periodStart.setMonth(0, 1); // Jan 1st
            periodStart.setHours(0,0,0,0);
            labels = Array.from({length: 12}, (_, i) => {
                const d = new Date(periodStart.getFullYear(), i, 1);
                return d.toLocaleString('en-US', { month: 'short' });
            });
            data = labels.map((label, i) => {
                return allPings.filter(ping => {
                    const d = new Date(ping.timestamp);
                    let match = d.getFullYear() === periodStart.getFullYear() && d.getMonth() === i;
                    if (selectedType !== 'all') match = match && ping.type === selectedType;
                    if (selectedStatus !== 'all') match = match && ping.status === selectedStatus;
                    return match;
                }).length;
            });
        } else {
            periodStart.setHours(0,0,0,0);
            periodStart.setDate(periodStart.getDate() - (daysToShow - 1));
            labels = Array.from({length: daysToShow}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (daysToShow - 1 - i));
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            data = Array.from({length: daysToShow}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (daysToShow - 1 - i));
                return allPings.filter(ping => {
                    let match = isSameDay(new Date(ping.timestamp), d);
                    if (selectedType !== 'all') match = match && ping.type === selectedType;
                    if (selectedStatus !== 'all') match = match && ping.status === selectedStatus;
                    return match;
                }).length;
            });
        }
        reportsActivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reports',
                    data: data,
                    borderColor: '#6b21a8',
                    backgroundColor: 'rgba(107, 33, 168, 0.08)',
                    borderWidth: 2,
                    pointBackgroundColor: '#6b21a8',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'white',
                        titleColor: '#111827',
                        bodyColor: '#111827',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: items => items[0].label,
                            label: item => `${item.formattedValue} reports`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#666', maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#eee' },
                        ticks: { color: '#666' }
                    }
                }
            }
        });

        // --- Update Stat Boxes Below Chart ---
        // Filter pings in the selected period AND by type/status
        let filteredPings;
        const now = new Date();
        if (period === 'year') {
            filteredPings = allPings.filter(ping => {
                const d = new Date(ping.timestamp);
                let match = d.getFullYear() === now.getFullYear();
                if (selectedType !== 'all') match = match && ping.type === selectedType;
                if (selectedStatus !== 'all') match = match && ping.status === selectedStatus;
                return match;
            });
        } else {
            filteredPings = allPings.filter(ping => {
                const d = new Date(ping.timestamp);
                let match = d >= periodStart && d <= now;
                if (selectedType !== 'all') match = match && ping.type === selectedType;
                if (selectedStatus !== 'all') match = match && ping.status === selectedStatus;
                return match;
            });
        }
        // 1. Total Reports
        const totalReports = filteredPings.length;
        // 2. Active Cases
        const activeCases = filteredPings.filter(p => (p.status === 'active' || p.status === 'pending' || p.status === 'investigating')).length;
        // 3. Resolution Rate
        const solved = filteredPings.filter(p => p.status === 'solved').length;
        const resolutionRate = totalReports > 0 ? Math.round((solved / totalReports) * 100) : 0;
        // Update DOM
        const statItems = document.querySelectorAll('.activity-chart-section .stat-item');
        if (statItems.length >= 3) {
            statItems[0].querySelector('.stat-value').textContent = totalReports;
            statItems[1].querySelector('.stat-value').textContent = activeCases;
            statItems[2].querySelector('.stat-value').textContent = resolutionRate + '%';
        }
    }

    // Helper for day comparison
    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() 
        && d1.getMonth() === d2.getMonth() 
        && d1.getDate() === d2.getDate();
    }

    // Call this when reports tab is shown or data is loaded
    function showReportsTabActivityChart() {
        setTimeout(() => initializeReportsActivityChart(), 100);
    }

    // Add tab switch handler for reports
    const reportsTabLinks = document.querySelectorAll('.sidebar-nav a[data-tab="reports"]');
    reportsTabLinks.forEach(link => {
        link.addEventListener('click', () => {
            showReportsTabActivityChart();
            renderRecentActivityFeed(); // Always update the feed on tab switch
        });
    });

    // If reports tab is active on load
    if (document.querySelector('.tab-pane#reports').classList.contains('active')) {
        showReportsTabActivityChart();
    }

    // Add this function to render the recent activity feed in the reports tab
    function renderRecentActivityFeed() {
        const container = document.querySelector('.activity-feed-section .feed-items');
        if (!container) return;
        // Stub: current user id
        const currentUserId = (window.user && window.user._id) || 'currentUserId';
        // Filter pings based on currentFeedFilter
        let filtered = [...allPings];
        if (currentFeedFilter === 'solved') {
            filtered = filtered.filter(p => p.status === 'solved' || p.status === 'resolved');
        } else if (currentFeedFilter === 'my-pings') {
            filtered = filtered.filter(p => {
                const pingUserId = p.user && (p.user._id || p.user.id || p.user.email);
                const currentId = currentUserId || (window.user && (window.user._id || window.user.id || window.user.email));
                console.log('Ping user:', p.user, 'Ping userId:', pingUserId, 'Current user ID:', currentId);
                return pingUserId && currentId && String(pingUserId) === String(currentId);
            });
        }
        // Sort by timestamp descending and take the latest 5
        const sorted = filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recent = sorted.slice(0, 5);
        container.innerHTML = '';
        if (recent.length === 0) {
            container.innerHTML = '<p class="no-pings-message">No recent activity.</p>';
            return;
        }
        recent.forEach((ping, idx) => {
            const pingUser = ping.user;
            let userName = 'Community User';
            if (pingUser) {
                if (pingUser.name) {
                    userName = pingUser.name;
                } else if (pingUser.firstName && pingUser.lastName) {
                    userName = `${pingUser.firstName} ${pingUser.lastName}`;
                } else if (pingUser.firstName) {
                    userName = pingUser.firstName;
                }
            }
            let userAvatar = config.getUserAvatarUrl(pingUser && pingUser._id ? pingUser._id : null);
            const pingTypeIcon = getPingTypeIcon(ping.type);
            const pingTypeLabel = formatPingTypeDisplay(ping.type);
            let statusClass = '';
            if (ping.status === 'solved' || ping.status === 'resolved') statusClass = 'resolved';
            else if (ping.status === 'active' || ping.status === 'investigating' || ping.status === 'pending') statusClass = 'active';
            else if (ping.status === 'urgent') statusClass = 'urgent';
            let photoHtml = '';
            if (ping.photo_url) {
                photoHtml = `<div class="ping-photo"><img src="${ping.photo_url}" alt="Ping Photo" style="width: 80%; max-height: 200px; object-fit: cover; border-radius: 10px; margin-top: 8px; display: block;"></div>`;
            }
            // Emoji reactions data (stub in-memory for now)
            if (!ping.reactions) ping.reactions = {};
            // Render emoji reactions bar (always show if any reaction, or if current user has reacted)
            let reactionsBar = '';
            const hasReactions = Object.keys(ping.reactions).length > 0;
            if (hasReactions) {
                reactionsBar = '<div class="emoji-reactions-bar">';
                for (const emoji in ping.reactions) {
                    const users = ping.reactions[emoji];
                    const reacted = users.includes(currentUserId);
                    reactionsBar += `<span class="emoji-reaction${reacted ? ' reacted' : ''}" data-emoji="${emoji}">${emoji} <span class="emoji-count">${users.length}</span></span>`;
                }
                reactionsBar += '</div>';
            }
            const pingElement = document.createElement('div');
            pingElement.className = `feed-item ${statusClass} ${ping.type}`;
            pingElement.innerHTML = `
                <div class=\"feed-avatar\">\n                    <img src=\"${userAvatar}\" alt=\"Profile Picture\" onerror=\"this.onerror=null;this.src='${config.DEFAULT_AVATAR}';\">\n                    <span class=\"status ${statusClass}\"></span>\n                </div>\n                <div class=\"feed-content\">
                    <div class=\"feed-header\">
                        <span class=\"feed-user\">${userName}</span>
                        <span class=\"feed-time\">${formatTimestamp(ping.timestamp)}</span>
                    </div>
                    <p class=\"feed-text\">${ping.description || ''}</p>
                    ${photoHtml}
                    ${reactionsBar}
                    <div class=\"view-on-map-bubble\">
                        <button class=\"view-on-map-btn\" title=\"View on Map\" data-lat=\"${ping.coordinates ? ping.coordinates[1] : ''}\" data-lng=\"${ping.coordinates ? ping.coordinates[0] : ''}\">View on Map</button>
                    </div>
                    <div class=\"feed-actions-icons\">
                        <button class=\"feed-action-icon emoji-btn\" title=\"React\"><i class=\"far fa-smile\"></i></button>
                        <button class=\"feed-action-icon modern-reply-btn\" title=\"Reply\"><i class=\"fas fa-reply\"></i></button>
                    </div>
                    <div class=\"inline-replies-thread\" style=\"display:none;\"></div>
                </div>\n            `;
            // Add View X replies link if replies exist
            const postId = 'ping-' + idx;
            const replies = window.feedReplies[postId] || [];
            if (replies.length > 0) {
                let viewReplies = document.createElement('a');
                viewReplies.className = 'view-replies-link';
                viewReplies.textContent = `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`;
                viewReplies.style = 'display:block;margin:0.5em 0 0 0;font-size:0.97em;color:#6b21a8;cursor:pointer;text-align:left;';
                viewReplies.onclick = function() {
                    const thread = pingElement.querySelector('.inline-replies-thread');
                    if (thread.style.display === 'block') {
                        thread.style.display = 'none';
                        viewReplies.textContent = `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`;
                    } else {
                        thread.innerHTML = replies.map(r => `
                            <div class='reply-item-card${r.type === 'suggestion' ? ' suggestion-reply' : ''}'>
                                <img class='reply-item-avatar' src='${r.avatar}' alt='${r.name}' />
                                <div class='reply-item-content'>
                                    <div class='reply-item-header'>
                                        <span class='reply-item-name'>${r.name}</span>
                                        <span class='reply-item-time'>${r.timestamp ? formatTimestamp(new Date(r.timestamp)) : ''}</span>
                                        ${r.type === 'suggestion' ? `<span class='suggestion-reply-badge'>Suggestion</span>` : ''}
                                    </div>
                                    ${r.type === 'suggestion' ?
                                      `<div class='suggestion-reply-line'><strong>${r.name}</strong> suggested this as <span class='suggestion-reply-status'>${r.suggestionStatus || ''}</span></div>` :
                                      ''}
                                    <div class='reply-item-text'>${(r.text||'').replace(/\n/g,'<br>')}</div>
                                    ${r.image ? `<img class='reply-item-image' src='${r.image}' style='max-width:120px;margin-top:0.5em;border-radius:8px;'>` : ''}
                                </div>
                            </div>
                        `).join('');
                        thread.style.display = 'block';
                        viewReplies.textContent = 'Hide replies';
                    }
                };
                pingElement.querySelector('.feed-content').appendChild(viewReplies);
            }
            // Modern reply button logic
            const replyBtn = pingElement.querySelector('.modern-reply-btn');
            if (replyBtn) {
                replyBtn.onclick = () => {
                    showReplyModal(postId, {
                        avatar: userAvatar,
                        name: userName,
                        timestamp: ping.timestamp,
                        text: ping.description || ''
                    });
                };
            }
            container.appendChild(pingElement);
        });
        // Add emoji picker logic
        container.querySelectorAll('.emoji-btn').forEach((btn, i) => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Remove any existing pickers
                document.querySelectorAll('.emoji-picker-pop').forEach(p => p.remove());
                // Create picker
                const picker = document.createElement('div');
                picker.className = 'emoji-picker-pop';
                picker.innerHTML = ['😀','😮','😡','😢','👍','👎'].map(emoji => `<span class='emoji-pick' data-emoji='${emoji}'>${emoji}</span>`).join('');
                btn.parentNode.appendChild(picker);
                // Picker click
                picker.querySelectorAll('.emoji-pick').forEach(span => {
                    span.addEventListener('click', function(ev) {
                        const emoji = this.getAttribute('data-emoji');
                        const ping = recent[i];
                        // Remove user from all reactions
                        for (const em in ping.reactions) {
                            ping.reactions[em] = ping.reactions[em].filter(uid => uid !== currentUserId);
                            if (ping.reactions[em].length === 0) delete ping.reactions[em];
                        }
                        // Add user to selected emoji
                        if (!ping.reactions[emoji]) ping.reactions[emoji] = [];
                        ping.reactions[emoji].push(currentUserId);
                        renderRecentActivityFeed();
                    });
                });
                // Close picker on outside click
                setTimeout(() => {
                    document.addEventListener('click', function handler(ev) {
                        if (!picker.contains(ev.target)) {
                            picker.remove();
                            document.removeEventListener('click', handler);
                        }
                    });
                }, 10);
            });
        });
        // Add event listeners for "View on Map" links
        container.querySelectorAll('.view-on-map').forEach(link => {
            if (!link.dataset.listenerAdded) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const lat = parseFloat(this.getAttribute('data-lat'));
                    const lng = parseFloat(this.getAttribute('data-lng'));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        const isLiveMapActive = document.getElementById('live-map').classList.contains('active');
                        if (isLiveMapActive && liveMap) {
                            liveMap.flyTo({ center: [lng, lat], zoom: 18, essential: true });
                            setTimeout(() => openPingPopupOnLiveMap(lng, lat), 500);
                        } else {
                            pendingFlyTo = { lng, lat, showPopup: true };
                            document.querySelector('a[data-tab="live-map"]').click();
                        }
                    } else {
                        alert('Location not available for this ping.');
                    }
                });
                link.dataset.listenerAdded = 'true';
            }
        });
        // Add event listeners for Reply buttons
        container.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const feedItem = this.closest('.feed-item');
                const replySection = feedItem.querySelector('.reply-section');
                // Hide all other reply sections
                container.querySelectorAll('.reply-section').forEach(sec => { sec.style.display = 'none'; });
                replySection.style.display = 'block';
                replySection.querySelector('.reply-input').focus();
            });
        });
        // Add event listeners for Cancel buttons
        container.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const replySection = this.closest('.reply-section');
                replySection.style.display = 'none';
            });
        });
        // Add event listeners for Send buttons (stub)
        container.querySelectorAll('.send-reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const replySection = this.closest('.reply-section');
                const input = replySection.querySelector('.reply-input');
                if (input.value.trim() === '') {
                    input.focus();
                    return;
                }
                // Stub: Show alert for now
                alert('Reply sent: ' + input.value);
                input.value = '';
                replySection.style.display = 'none';
            });
        });
        // Add event listeners for See replies links
        container.querySelectorAll('.see-replies-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const feedItem = this.closest('.feed-item');
                const replySection = feedItem.querySelector('.reply-section');
                // Hide all other reply sections
                container.querySelectorAll('.reply-section').forEach(sec => { sec.style.display = 'none'; });
                replySection.style.display = 'block';
                replySection.querySelector('.reply-input').focus();
            });
        });
    }

    // Add filter logic for feed-filters
    const feedFilters = document.querySelectorAll('.feed-filters button');
    let currentFeedFilter = 'latest';
    feedFilters.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            feedFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (idx === 0) currentFeedFilter = 'latest';
            else if (idx === 1) currentFeedFilter = 'solved';
            else if (idx === 2) currentFeedFilter = 'my-pings';
            renderRecentActivityFeed();
        });
    });

    // Add image enlarge modal logic
    function createImageModal(imgSrc) {
        // Remove any existing modal
        document.querySelectorAll('.enlarge-image-modal').forEach(m => m.remove());
        const modal = document.createElement('div');
        modal.className = 'enlarge-image-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `<img src="${imgSrc}" style="max-width:96vw;max-height:96vh;border-radius:18px;box-shadow:0 8px 32px rgba(0,0,0,0.25);background:#fff;display:block;">`;
        modal.addEventListener('click', () => modal.remove());
        modal.querySelector('img').addEventListener('click', e => {
            e.stopPropagation();
            modal.remove();
        });
        document.body.appendChild(modal);
    }

    // Add event delegation for click-to-enlarge on all relevant ping images
    document.body.addEventListener('click', function(e) {
        if (
            e.target.matches('.ping-photo img') ||
            e.target.matches('.feed-item .ping-photo img') ||
            e.target.matches('.ping-media img')
        ) {
            e.stopPropagation();
            createImageModal(e.target.src);
        }
    });

    // Add event delegation for click-to-enlarge on evidence images in report details (top-level, always active)
    if (!window._evidenceImageModalHandlerSet) {
        document.body.addEventListener('click', function(e) {
            if (e.target.matches('.evidence-item img')) {
                e.stopPropagation();
                createImageModal(e.target.src);
            }
        });
        window._evidenceImageModalHandlerSet = true;
    }

    // Re-initialize resizable columns after table content is updated
    initializeResizableColumns();

    // Add direct click handler to evidence images for debugging
    document.querySelectorAll('.evidence-item img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            createImageModal(img.src);
        });
    });

    // On dashboard load, check if user is admin of their neighborhood
    async function checkIfUserIsAdminOnDashboard() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user._id) return false;
        try {
            // Fetch the user's neighborhood by user ID
            const res = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.NEIGHBORHOOD}/${user._id}`), {
                headers: { 'x-user-id': user._id }
            });
            if (!res.ok) return false;
            const neighborhood = await res.json();
            // Admin: user is admin if they created the neighborhood
            const isAdmin = neighborhood.createdBy && String(neighborhood.createdBy) === String(user._id);
            localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
            return isAdmin;
        } catch {
            return false;
        }
    }
    // Call this function on dashboard load (e.g., in DOMContentLoaded)
    checkIfUserIsAdminOnDashboard();

    // Patch renderRecentActivityFeed to add reply UI (ensure this runs after the original is defined)
    document.addEventListener('DOMContentLoaded', () => {
      if (window.renderRecentActivityFeed && !window._replyPatchApplied) {
        const origRenderRecentActivityFeed = window.renderRecentActivityFeed;
        window.renderRecentActivityFeed = function() {
          origRenderRecentActivityFeed();
          // Add reply UI
          const container = document.querySelector('.activity-feed-section .feed-items');
          if (!container) return;
          container.querySelectorAll('.feed-item').forEach((item, idx) => {
            // Ensure each feed-item has a unique data-ping-id
            if (!item.dataset.pingId) {
              // Try to get from the ping object if available
              let postId = item.getAttribute('data-ping-id') || item.id || 'post-' + idx;
              item.setAttribute('data-ping-id', postId);
            }
            const postId = item.dataset.pingId;
            // Add reply button if not present
            if (!item.querySelector('.modern-reply-btn')) {
              const replyBtn = document.createElement('button');
              replyBtn.className = 'feed-action-icon modern-reply-btn';
              replyBtn.innerHTML = '<i class="fas fa-reply"></i>';
              replyBtn.title = 'Reply';
              replyBtn.onclick = () => {
                const postContent = item.querySelector('.feed-text')?.textContent || '';
                showReplyModal(postId, postContent);
              };
              item.querySelector('.feed-actions-icons')?.appendChild(replyBtn);
            }
            // Add View x replies link
            let replies = window.feedReplies[postId] || [];
            let viewReplies = item.querySelector('.view-replies-link');
            if (replies.length > 0) {
              if (!viewReplies) {
                viewReplies = document.createElement('a');
                viewReplies.className = 'view-replies-link';
                viewReplies.style = 'display:block;margin:0.5em 0 0 0;font-size:0.97em;color:#6b21a8;cursor:pointer;text-align:left;';
                item.querySelector('.feed-content').appendChild(viewReplies);
              }
              viewReplies.textContent = `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`;
              viewReplies.onclick = () => showRepliesModal(postId);
            } else if (viewReplies) {
              viewReplies.remove();
            }
          });
        };
        window._replyPatchApplied = true;
      }
    });

    // Initialize reply modal features
    initializeReplyModalFeatures();
});

// Enhanced Reply Modal Functionality
function initializeReplyModalFeatures() {
  const replyInput = document.getElementById('replyInput');
  const emojiBtn = document.getElementById('replyEmojiBtn');
  const emojiPicker = document.getElementById('replyEmojiPicker');
  const imageInput = document.getElementById('replyImageInput');
  const imagePreview = document.getElementById('replyImagePreview');
  const imageContainer = document.getElementById('replyImagePreviewContainer');
  const imageRemove = document.getElementById('replyImageRemove');
  const submitBtn = document.getElementById('submitReplyBtn');
  const mentionsDropdown = document.getElementById('replyMentionsDropdown');

  // Emoji Picker Functionality
  if (emojiBtn && emojiPicker) {
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.classList.toggle('active');
    });

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.remove('active');
      }
    });

    // Emoji selection
    emojiPicker.querySelectorAll('.reply-emoji-item').forEach(item => {
      item.addEventListener('click', () => {
        const emoji = item.dataset.emoji;
        const cursorPos = replyInput.selectionStart;
        const textBefore = replyInput.value.substring(0, cursorPos);
        const textAfter = replyInput.value.substring(cursorPos);
        replyInput.value = textBefore + emoji + textAfter;
        replyInput.focus();
        replyInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        emojiPicker.classList.remove('active');
        updateSendButtonState();
      });
    });
  }

  // Image Upload and Preview
  if (imageInput && imagePreview && imageContainer && imageRemove) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          imagePreview.src = ev.target.result;
          imageContainer.style.display = 'block';
          updateSendButtonState();
        };
        reader.readAsDataURL(file);
      }
    });

    // Remove image
    imageRemove.addEventListener('click', () => {
      imageContainer.style.display = 'none';
      imagePreview.src = '';
      imageInput.value = '';
      updateSendButtonState();
    });
  }

  // @Mentions Support
  if (replyInput && mentionsDropdown) {
    let mentionStart = -1;
    let filteredUsers = [];

    replyInput.addEventListener('input', (e) => {
      const text = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      // Check for @ symbol
      const lastAtSymbol = text.lastIndexOf('@', cursorPos - 1);
      if (lastAtSymbol !== -1 && lastAtSymbol < cursorPos) {
        const query = text.substring(lastAtSymbol + 1, cursorPos).toLowerCase();
        if (query.length > 0) {
          mentionStart = lastAtSymbol;
          showMentionsDropdown(query);
        } else {
          hideMentionsDropdown();
        }
      } else {
        hideMentionsDropdown();
      }
      updateSendButtonState();
    });

    // Handle keyboard navigation in mentions dropdown
    replyInput.addEventListener('keydown', (e) => {
      if (mentionsDropdown.classList.contains('active')) {
        const selectedItem = mentionsDropdown.querySelector('.reply-mention-item.selected');
        const items = mentionsDropdown.querySelectorAll('.reply-mention-item');
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (selectedItem) {
            selectedItem.classList.remove('selected');
            const nextItem = selectedItem.nextElementSibling || items[0];
            nextItem.classList.add('selected');
          } else {
            items[0].classList.add('selected');
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (selectedItem) {
            selectedItem.classList.remove('selected');
            const prevItem = selectedItem.previousElementSibling || items[items.length - 1];
            prevItem.classList.add('selected');
          } else {
            items[items.length - 1].classList.add('selected');
          }
        } else if (e.key === 'Enter' && selectedItem) {
          e.preventDefault();
          insertMention(selectedItem.dataset.username, selectedItem.dataset.name);
        } else if (e.key === 'Escape') {
          hideMentionsDropdown();
        }
      }
    });
  }

  // Send Button State Management
  function updateSendButtonState() {
    const hasText = replyInput.value.trim().length > 0;
    const hasImage = imageContainer.style.display === 'block';
    
    if (hasText || hasImage) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  }

  // Mentions Functions
  function showMentionsDropdown(query) {
    // Mock users for now - replace with actual user data
    const users = [
      { username: 'ansh', name: 'Ansh Makkar', avatar: 'assets/avatar.svg' },
      { username: 'jane', name: 'Jane Doe', avatar: 'assets/avatar.svg' },
      { username: 'john', name: 'John Smith', avatar: 'assets/avatar.svg' }
    ];
    
    filteredUsers = users.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.username.toLowerCase().includes(query)
    );

    if (filteredUsers.length > 0) {
      mentionsDropdown.innerHTML = filteredUsers.map(user => `
        <div class="reply-mention-item" data-username="${user.username}" data-name="${user.name}">
          <img class="reply-mention-avatar" src="${user.avatar}" alt="${user.name}" />
          <span class="reply-mention-name">${user.name}</span>
        </div>
      `).join('');

      // Position dropdown near cursor
      const rect = replyInput.getBoundingClientRect();
      mentionsDropdown.style.top = `${rect.bottom + 5}px`;
      mentionsDropdown.style.left = `${rect.left}px`;
      mentionsDropdown.classList.add('active');

      // Add click handlers
      mentionsDropdown.querySelectorAll('.reply-mention-item').forEach(item => {
        item.addEventListener('click', () => {
          insertMention(item.dataset.username, item.dataset.name);
        });
      });
    } else {
      hideMentionsDropdown();
    }
  }

  function hideMentionsDropdown() {
    mentionsDropdown.classList.remove('active');
    mentionsDropdown.innerHTML = '';
  }

  function insertMention(username, name) {
    const text = replyInput.value;
    const beforeMention = text.substring(0, mentionStart);
    const afterMention = text.substring(replyInput.selectionStart);
    const mentionText = `@${username} `;
    
    replyInput.value = beforeMention + mentionText + afterMention;
    replyInput.focus();
    const newCursorPos = mentionStart + mentionText.length;
    replyInput.setSelectionRange(newCursorPos, newCursorPos);
    
    hideMentionsDropdown();
    updateSendButtonState();
  }

  // Enhanced Send Button with Loading State
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (submitBtn.disabled) return;
      
      // Show loading state
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      
      try {
        // Simulate sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Existing send logic
        const modal = document.getElementById('replyModal');
        const postId = modal.dataset.postId;
        const text = replyInput.value.trim();
        const imgInput = document.getElementById('replyImageInput');
        let image = '';
        if (imgInput && imgInput.files[0]) {
          image = imagePreview.src;
        }
        
        if (!text && !image) return;
        
        // Fake user
        const user = window.user || { firstName: 'You', avatar: 'assets/avatar.svg' };
        if (!window.feedReplies[postId]) window.feedReplies[postId] = [];
        window.feedReplies[postId].push({
          name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
          avatar: user.avatar || 'assets/avatar.svg',
          text,
          image,
          timestamp: Date.now(),
          reactions: {}
        });
        
        closeReplyModal();
        renderRecentActivityFeed();
        
      } catch (error) {
        console.error('Error sending reply:', error);
      } finally {
        // Reset loading state
        submitBtn.classList.remove('loading');
        updateSendButtonState();
      }
    });
  }

  // Initial state
  updateSendButtonState();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() 
    && d1.getMonth() === d2.getMonth() 
    && d1.getDate() === d2.getDate();
}

function getPingTypeIcon(type) {
    switch(type) {
        case 'suspicious':
            return `<img src="./assets/Ping-Suspicious.svg" alt="Suspicious" class="ping-svg-icon">`;
        case 'break-enter':
            return `<img src="./assets/Ping-Break-enter.svg" alt="Break & Enter" class="ping-svg-icon">`;
        case 'fire':
            return `<img src="./assets/Ping-Fire.svg" alt="Fire" class="ping-svg-icon">`;
        case 'other':
        default:
            return `<img src="./assets/Ping-Car-theft.svg" alt="Other" class="ping-svg-icon">`;
    }
}

// Helper to filter and update a map/feed given a map, feed container, and filter controls
function setupMapFilters({mapInstance, feedContainerId, categoryTogglesSelector, timeFilterSelector}) {
    let currentCategory = 'all';
    let currentTime = 'all';
    const categoryButtons = document.querySelectorAll(categoryTogglesSelector + ' button');
    const timeFilter = document.querySelector(timeFilterSelector);

    function applyFilters() {
        let filtered = allPings;
        if (currentCategory !== 'all') {
            filtered = filtered.filter(ping => ping.type === currentCategory);
        }
        const now = new Date();
        if (currentTime === '1h') {
            filtered = filtered.filter(ping => (now - ping.timestamp) < 60 * 60 * 1000);
        } else if (currentTime === '24h') {
            filtered = filtered.filter(ping => (now - ping.timestamp) < 24 * 60 * 60 * 1000);
        } else if (currentTime === '7d') {
            filtered = filtered.filter(ping => (now - ping.timestamp) < 7 * 24 * 60 * 60 * 1000);
        } else if (currentTime === '30d') {
            filtered = filtered.filter(ping => (now - ping.timestamp) < 30 * 24 * 60 * 60 * 1000);
        } // 'all' shows everything
        updateMapMarkers(mapInstance, filtered, currentCategory);
        if (feedContainerId) {
            renderPings(filtered, feedContainerId);
        }
    }

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-category');
            applyFilters();
            fetchPings(); // Fetch fresh data when category filter changes
        });
    });
    if (timeFilter) {
        timeFilter.addEventListener('change', function() {
            currentTime = this.value;
            applyFilters();
            fetchPings(); // Fetch fresh data when time filter changes
        });
    }
    // Initial filter
    applyFilters();
}

// Homepage map filters
setupMapFilters({
    mapInstance: map,
    feedContainerId: 'recent-updates-container',
    categoryTogglesSelector: '.map-section .category-toggles',
    timeFilterSelector: '.map-section .time-filter'
});

// Live map tab filters
setupMapFilters({
    mapInstance: liveMap,
    feedContainerId: 'ping-details-container',
    categoryTogglesSelector: '#live-map .category-toggles',
    timeFilterSelector: '#live-map .time-filter'
});

// Only call renderLiveMapPingDetails when switching to the live map tab (to show all pings by default)
const liveMapTab = document.querySelector('a[data-tab="live-map"]');
if (liveMapTab) {
    liveMapTab.addEventListener('click', () => {
        currentPingsDisplayed = 0;
        renderPings(allPings, 'ping-details-container');
    });
}

function openPingPopupOnLiveMap(lng, lat) {
    if (!liveMap || !liveMap._markers) return;
    // Find the marker with matching coordinates
    const marker = liveMap._markers.find(m => {
        const markerLngLat = m.getLngLat();
        return Math.abs(markerLngLat.lng - lng) < 1e-6 && Math.abs(markerLngLat.lat - lat) < 1e-6;
    });
    if (marker && marker.getPopup()) {
        marker.togglePopup();
    }
}

// Enhanced Reports Functionality
let currentReports = [];
let currentReportId = null;

// Load reports from backend
async function loadReports() {
    try {
        // Get the user's neighborhoodId (same logic as fetchPings)
        const user = JSON.parse(localStorage.getItem('user'));
        let neighborhoodId = null;
        if (user && user._id) {
            const nRes = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.NEIGHBORHOOD}/${user._id}`));
            if (nRes.ok) {
                const neighborhood = await nRes.json();
                if (neighborhood && neighborhood._id) {
                    neighborhoodId = neighborhood._id;
                }
            }
        }
        // Fetch reports for this neighborhood only
        const response = await fetch(
            neighborhoodId
                ? config.getApiUrl(`${config.API_ENDPOINTS.REPORTS}?neighborhoodId=${neighborhoodId}`)
                : config.getApiUrl(config.API_ENDPOINTS.REPORTS)
        );
        if (!response.ok) {
            throw new Error('Failed to fetch reports');
        }
        const reports = await response.json();
        currentReports = reports;
        applyReportFilters();
        // Update the loading state
        const loadingElement = document.querySelector('.reports-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Failed to load reports');
        // Show error state
        const tbody = document.getElementById('reports-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="no-reports">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load reports. Please try again.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Render reports table
function renderReportsTable(reports) {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;

    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="no-reports">
                        <i class="fas fa-inbox"></i>
                        <p>No reports found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reports.map(report => {
        const createdAt = new Date(report.createdAt);
        const timeResolved = report.timeResolved ? new Date(report.timeResolved) : null;
        const hasEvidence = report.photo_url;
        const isRecent = (Date.now() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days

        // Avatar logic
        let userAvatar = config.getUserAvatarUrl(report.user && report.user._id ? report.user._id : null);
        let reportAvatar = `<img src="${userAvatar}" alt="${report.user ? (report.user.firstName + ' ' + report.user.lastName) : 'User'}" class="report-avatar" onerror="this.onerror=null;this.src='${config.DEFAULT_AVATAR}';">`;

        // Evidence icon
        let evidenceHtml = hasEvidence
            ? `<span class="evidence-icon has-evidence" title="Evidence attached"><i class="fas fa-paperclip"></i></span>`
            : `<span class="evidence-icon no-evidence" title="No evidence">—</span>`;

        // Status badge logic
        let status = report.status ? report.status.toLowerCase() : 'active';
        let statusIcon = '';
        let statusClass = '';
        let statusTooltip = '';
        switch (status) {
            case 'active':
                statusIcon = '<i class="fas fa-circle"></i>';
                statusClass = 'status-badge-active';
                statusTooltip = 'Active';
                break;
            case 'resolved':
                statusIcon = '<i class="fas fa-check-circle"></i>';
                statusClass = 'status-badge-resolved';
                statusTooltip = 'Resolved';
                break;
            case 'investigating':
                statusIcon = '<i class="fas fa-search"></i>';
                statusClass = 'status-badge-investigating';
                statusTooltip = 'Investigating';
                break;
            case 'pending':
                statusIcon = '<i class="fas fa-clock"></i>';
                statusClass = 'status-badge-pending';
                statusTooltip = 'Pending';
                break;
            default:
                statusIcon = '<i class="fas fa-circle"></i>';
                statusClass = 'status-badge-active';
                statusTooltip = 'Active';
        }
        let statusHtml = `<span class="status-badge ${statusClass}" title="${statusTooltip}">${statusIcon} <span>${statusTooltip}</span></span>`;

        // Time to resolve calculation
        let timeToResolve = '-';
        if (timeResolved && (report.status === 'resolved' || report.status === 'solved')) {
            const diffMs = timeResolved - createdAt;
            const diffMins = Math.floor(diffMs / 60000);
            const days = Math.floor(diffMins / 1440);
            const hours = Math.floor((diffMins % 1440) / 60);
            const mins = diffMins % 60;
            let parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
            timeToResolve = parts.join(' ');
        }

        // Evidence display logic
        let evidenceSectionHtml = '';
        if (hasEvidence) {
            evidenceSectionHtml = `<div class="evidence-gallery">
                <div class="evidence-item">
                    <img src="https://api-3ffpwchysq-uc.a.run.app/api/ping/${report._id}/photo" 
                         alt="Report evidence" 
                         onerror="this.onerror=null;this.src='${config.DEFAULT_AVATAR}';">
                </div>
            </div>`;
        } else if (report.evidence && report.evidence.length > 0) {
            evidenceSectionHtml = `<div class="evidence-list"></div>`;
        } else {
            evidenceSectionHtml = '<div class="no-evidence-message">No evidence attached</div>';
        }

        return `
            <tr class="report-row" data-report-id="${report._id}" style="font-size:0.95em;">
                <td>
                  <div class="report-flex-row">
                    <span class="report-avatar">${reportAvatar}</span>
                  </div>
                </td>
                <td>
                  <div class="report-flex-row">
                    <span class="reporter-name">${report.user ? `${report.user.firstName}<br>${report.user.lastName}` : 'Unknown'}</span>
                  </div>
                </td>
                <td class="type-col">
                  <span class="badge">${formatPingTypeDisplay(report.type)}</span>
                </td>
                <td>
                  <div class="report-flex-row">
                    <span class="description-cell" title="${report.description}">
                      ${report.description.length > 15 ? report.description.slice(0, 15) + '…' : report.description}
                    </span>
                  </div>
                </td>
                <td>${formatTimestamp(createdAt)}</td>
                <td class="cell-flex-center">
                  ${statusHtml}
                </td>
                <td>${timeToResolve}</td>
                <td class="cell-flex-center">
                  ${evidenceHtml}
                </td>
                <td class="cell-flex-center">
                    <div class="action-buttons">
                        <button class="action-btn follow-up ${!isRecent ? 'disabled' : ''}" 
                                onclick="addFollowUp('${report._id}')" 
                                ${!isRecent ? 'disabled' : ''}
                                title="Follow-Up">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="expand-btn" onclick="toggleReportDetails('${report._id}')">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </td>
            </tr>
            <tr class="report-details" id="details-${report._id}" style="display: none; font-size:0.95em;">
                <td colspan="10">
                    <div class="report-card">
                        <div class="report-info">
                            <div class="report-meta">
                                <div class="report-photos">
                                    <h5>Evidence</h5>
                                    ${evidenceSectionHtml}
                                </div>
                                <div class="report-location">
                                    <h5>Location</h5>
                                    <div id="report-map-${report._id}" class="report-mini-map" data-lat="${report.location.lat}" data-lng="${report.location.lng}"></div>
                                    <button class="view-location" onclick="viewLocationOnMap(${report.location.lat}, ${report.location.lng})">
                                        <i class="fas fa-map-marker-alt"></i> View on Map
                                    </button>
                                </div>
                            </div>
                            <div class="report-suggestions">
                                <h5>Suggestions</h5>
                                <div class="suggestions-list">
                                    ${(() => {
                                        let suggestionsHtml = '';
                                        
                                        // Add suggestions from report data
                                        if (report.suggestions && report.suggestions.length > 0) {
                                            report.suggestions.forEach(suggestion => {
                                                suggestionsHtml += `
                                                    <div class="suggestion-item">
                                                        <div class="suggestion-meta">
                                                            <div class="suggestion-user">
                                                                ${suggestion.addedBy && suggestion.addedBy.avatar ? 
                                                                    `<img src="${suggestion.addedBy.avatar}" alt="${suggestion.addedBy.name}" class="suggestion-avatar">` : 
                                                                    `<div class="suggestion-avatar-initials">${suggestion.addedBy && suggestion.addedBy.name ? suggestion.addedBy.name.charAt(0).toUpperCase() : 'U'}</div>`
                                                                }
                                                                <span class="suggestion-author">${suggestion.addedBy && suggestion.addedBy.name ? suggestion.addedBy.name : 'Unknown'}</span>
                                                                <span class="suggestion-time">${suggestion.addedAt ? formatTimestamp(new Date(suggestion.addedAt)) : ''}</span>
                                                </div>
                                            </div>
                                                        <div class="suggestion-content">
                                                            <span class="suggestion-text"><strong>${suggestion.addedBy && suggestion.addedBy.name ? suggestion.addedBy.name : 'Unknown'}</strong> suggested to change this post to</span>
                                                            <span class="status-badge suggestion-status ${getSuggestionStatusClass(suggestion.suggestedStatus)}">
                                                                ${getSuggestionStatusIcon(suggestion.suggestedStatus)}
                                                                ${suggestion.suggestedStatus}
                                                            </span>
                                                        </div>
                                                        ${suggestion.comment ? `<div class="suggestion-comment">${suggestion.comment}</div>` : ''}
                                                    </div>
                                                `;
                                            });
                                        }
                                        
                                        // Add suggestions from localStorage
                                        const storedFollowUps = JSON.parse(localStorage.getItem('reportFollowUps') || '{}');
                                        if (storedFollowUps[report._id] && storedFollowUps[report._id].length > 0) {
                                            storedFollowUps[report._id].forEach(followUp => {
                                                if (followUp.type === 'suggestion') {
                                                    suggestionsHtml += `
                                                        <div class="suggestion-item">
                                                            <div class="suggestion-meta">
                                                                <div class="suggestion-user">
                                                                    ${followUp.addedBy && followUp.addedBy.avatar ? 
                                                                        `<img src="${followUp.addedBy.avatar}" alt="${followUp.addedBy.name}" class="suggestion-avatar">` : 
                                                                        `<div class="suggestion-avatar-initials">${followUp.addedBy && followUp.addedBy.name ? followUp.addedBy.name.charAt(0).toUpperCase() : 'U'}</div>`
                                                                    }
                                                                    <span class="suggestion-author">${followUp.addedBy && followUp.addedBy.name ? followUp.addedBy.name : 'Unknown'}</span>
                                                                    <span class="suggestion-time">${followUp.addedAt ? formatTimestamp(new Date(followUp.addedAt)) : ''}</span>
                                </div>
                            </div>
                                                            <div class="suggestion-content">
                                                                <span class="suggestion-text"><strong>${followUp.addedBy && followUp.addedBy.name ? followUp.addedBy.name : 'Unknown'}</strong> suggested to change this post to</span>
                                                                <span class="status-badge suggestion-status ${getSuggestionStatusClass(followUp.action)}">
                                                                    ${getSuggestionStatusIcon(followUp.action)}
                                                                    ${followUp.action}
                                                                </span>
                                                            </div>
                                                            ${followUp.description ? `<div class="suggestion-comment">${followUp.description}</div>` : ''}
                                                        </div>
                                                    `;
                                                }
                                            });
                                        }
                                        
                                        return suggestionsHtml || '<div class="no-suggestions-message">No suggestions yet.</div>';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Re-initialize resizable columns after table content is updated
    initializeResizableColumns();
}

// Helper functions for suggestion status styling
function getSuggestionStatusClass(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('solved') || statusLower.includes('resolve')) {
        return 'solved';
    } else if (statusLower.includes('unsolved') || statusLower.includes('unresolve')) {
        return 'unsolved';
    } else if (statusLower.includes('guard') || statusLower.includes('security')) {
        return 'guard';
    } else {
        return 'other';
    }
}

function getSuggestionStatusIcon(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('solved') || statusLower.includes('resolve')) {
        return '<i class="fas fa-check-circle"></i>';
    } else if (statusLower.includes('unsolved') || statusLower.includes('unresolve')) {
        return '<i class="fas fa-times-circle"></i>';
    } else if (statusLower.includes('guard') || statusLower.includes('security')) {
        return '<i class="fas fa-shield-alt"></i>';
    } else {
        return '<i class="fas fa-lightbulb"></i>';
    }
}

// Toggle report details
function toggleReportDetails(reportId) {
    const detailsRow = document.getElementById(`details-${reportId}`);
    const expandBtn = document.querySelector(`[data-report-id="${reportId}"] .expand-btn i`);
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        expandBtn.className = 'fas fa-chevron-up';
        window.renderReportMiniMaps();
    } else {
        detailsRow.style.display = 'none';
        expandBtn.className = 'fas fa-chevron-down';
        // Clean up map instance
        const miniMapDiv = detailsRow.querySelector('.report-mini-map');
        if (miniMapDiv && miniMapDiv._miniMap) {
            miniMapDiv._miniMap.remove();
            miniMapDiv._miniMap = null;
        }
    }
}

// Add note to report
async function addNote(reportId) {
    currentReportId = reportId;
    const modal = document.getElementById('addNoteModal');
    modal.classList.add('active');
}

// Add follow-up to report
async function addFollowUp(reportId) {
    currentReportId = reportId;
    const modal = document.getElementById('addFollowUpModal');
    modal.classList.add('active');
}

// View report trail
async function viewReportTrail(reportId) {
    try {
        const response = await fetch(`${config.getApiUrl(config.API_ENDPOINTS.REPORT_TRAIL, reportId)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch report trail');
        }

        const report = await response.json();
        const modal = document.getElementById('reportTrailModal');
        const content = document.getElementById('reportTrailContent');

        let trailHtml = `
            <div class="trail-item">
                <div class="trail-header">
                    <span class="trail-author">${report.user ? report.user.name : 'Unknown'}</span>
                    <span class="trail-time">${formatTimestamp(new Date(report.createdAt))}</span>
                </div>
                <div class="trail-content">
                    <strong>Report Created:</strong> ${report.description}
                </div>
            </div>
        `;

        // Add notes
        if (report.notes && report.notes.length > 0) {
            report.notes.forEach(note => {
                trailHtml += `
                    <div class="trail-item note">
                        <div class="trail-header">
                            <span class="trail-author">${note.addedBy ? note.addedBy.name : 'Unknown'}</span>
                            <span class="trail-time">${formatTimestamp(new Date(note.addedAt))}</span>
                        </div>
                        <div class="trail-content">${note.content}</div>
                    </div>
                `;
            });
        }

        // Add follow-ups
        if (report.followUps && report.followUps.length > 0) {
            report.followUps.forEach(followUp => {
                trailHtml += `
                    <div class="trail-item follow-up">
                        <div class="trail-header">
                            <span class="trail-author">${followUp.addedBy ? followUp.addedBy.name : 'Unknown'}</span>
                            <span class="trail-time">${formatTimestamp(new Date(followUp.addedAt))}</span>
                        </div>
                        <div class="trail-content">
                            <div class="trail-action">${followUp.action}</div>
                            ${followUp.description ? `<div>${followUp.description}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        // Add follow-ups from localStorage
        const storedFollowUps = JSON.parse(localStorage.getItem('reportFollowUps') || '{}');
        if (storedFollowUps[reportId] && storedFollowUps[reportId].length > 0) {
            storedFollowUps[reportId].forEach(followUp => {
                trailHtml += `
                    <div class="trail-item follow-up">
                        <div class="trail-header">
                            <span class="trail-author">${followUp.addedBy ? followUp.addedBy.name : 'Unknown'}</span>
                            <span class="trail-time">${formatTimestamp(new Date(followUp.addedAt))}</span>
                        </div>
                        <div class="trail-content">
                            <div class="trail-action">${followUp.type === 'suggestion' ? followUp.action : 'Evidence Uploaded'}</div>
                            ${followUp.description ? `<div>${followUp.description}</div>` : ''}
                            ${followUp.evidenceFile ? `<div><strong>File:</strong> ${followUp.evidenceFile}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        content.innerHTML = trailHtml;
        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading report trail:', error);
        showError('Failed to load report trail');
    }
}

// Modal functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    
    // Clear forms
    if (modalId === 'addNoteModal') {
        document.getElementById('addNoteForm').reset();
    } else if (modalId === 'addFollowUpModal') {
        document.getElementById('addFollowUpForm').reset();
    }
}

// Global modal close handlers
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal when clicking close button
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
        });
    });

    // Handle note form submission
    const addNoteForm = document.getElementById('addNoteForm');
    if (addNoteForm) {
        addNoteForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                showError('User not authenticated');
                return;
            }

            const formData = new FormData(this);
            const noteData = {
                content: formData.get('content'),
                addedBy: user._id
            };

            try {
                const response = await fetch(`${config.getApiUrl(config.API_ENDPOINTS.REPORT_NOTE, currentReportId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(noteData)
                });

                if (!response.ok) {
                    throw new Error('Failed to add note');
                }

                closeModal('addNoteModal');
                loadReports(); // Refresh the reports
                showSuccess('Note added successfully');
            } catch (error) {
                console.error('Error adding note:', error);
                showError('Failed to add note');
            }
        });
    }

    // Handle follow-up form submission
    const addFollowUpForm = document.getElementById('addFollowUpForm');
    if (addFollowUpForm) {
        addFollowUpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get current user data with avatar
            const currentUser = window.user || JSON.parse(localStorage.getItem('user')) || { _id: 'demo-user', name: 'Demo User' };
            const user = {
                _id: currentUser._id || currentUser.id || 'demo-user',
                name: currentUser.name || currentUser.firstName || 'Demo User',
                avatar: currentUser.avatar || currentUser.profilePicture || 'assets/avatar.svg'
            };

            const formData = new FormData(this);
            const followUpType = formData.get('followupType');
            
            let followUpData = {
                type: followUpType,
                addedBy: user,
                addedAt: new Date().toISOString()
            };

            if (followUpType === 'suggestion') {
                followUpData.action = formData.get('action');
                followUpData.description = formData.get('description');
            } else if (followUpType === 'evidence') {
                followUpData.description = formData.get('evidenceNote');
                // Handle file upload if needed
                const evidenceFile = formData.get('evidenceImage');
                if (evidenceFile && evidenceFile.size > 0) {
                    followUpData.evidenceFile = evidenceFile.name;
                }
            }

            try {
                // For now, store in localStorage since we don't have a backend
                const existingFollowUps = JSON.parse(localStorage.getItem('reportFollowUps') || '{}');
                if (!existingFollowUps[currentReportId]) {
                    existingFollowUps[currentReportId] = [];
                }
                existingFollowUps[currentReportId].push(followUpData);
                localStorage.setItem('reportFollowUps', JSON.stringify(existingFollowUps));

                closeModal('addFollowUpModal');
                loadReports(); // Refresh the reports
                showSuccess('Follow-up added successfully');
                
                // Reset form
                this.reset();
                updateFollowUpModalFields();
            } catch (error) {
                console.error('Error adding follow-up:', error);
                showError('Failed to add follow-up');
            }
        });
    }

    // Handle filter changes
    const filters = document.querySelectorAll('.reports-filters select, .reports-filters input');
    filters.forEach(filter => {
        filter.addEventListener('change', applyReportFilters);
    });

    // Load reports when reports tab is opened
    const reportsTab = document.querySelector('a[data-tab="reports"]');
    if (reportsTab) {
        reportsTab.addEventListener('click', () => {
            // Load reports when tab is clicked
            loadReports();
        });
    }

    // Auto-load reports if reports tab is active on page load
    const activeTab = document.querySelector('.tab-pane.active');
    if (activeTab && activeTab.id === 'reports') {
        loadReports();
    }

    // Initialize resizable columns
    initializeResizableColumns();

    // Add Follow-up Modal: Toggle Suggestion/Evidence fields
    function updateFollowUpModalFields() {
        const suggestionFields = document.getElementById('suggestionFields');
        const evidenceFields = document.getElementById('evidenceFields');
        const typeRadios = document.querySelectorAll('input[name="followupType"]');
        let selectedType = 'suggestion';
        typeRadios.forEach(radio => {
            if (radio.checked) selectedType = radio.value;
        });
        if (selectedType === 'evidence') {
            suggestionFields.style.display = 'none';
            evidenceFields.style.display = '';
        } else {
            suggestionFields.style.display = '';
            evidenceFields.style.display = 'none';
        }
    }
    // Attach event listeners to radio buttons
    document.querySelectorAll('input[name="followupType"]').forEach(radio => {
        radio.addEventListener('change', updateFollowUpModalFields);
    });
    // Also update fields when modal is opened
    const addFollowUpModal = document.getElementById('addFollowUpModal');
    if (addFollowUpModal) {
        addFollowUpModal.addEventListener('transitionend', updateFollowUpModalFields);
        // Or, if you have a function that opens the modal, call updateFollowUpModalFields() there
    }
    // Initial call in case modal is already open
    updateFollowUpModalFields();
});

// Utility functions
function showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message);
}

function showSuccess(message) {
    // You can implement a toast notification system here
    alert('Success: ' + message);
}

// Function to view location on map
function viewLocationOnMap(lat, lng) {
    // Switch to live map tab
    const liveMapTab = document.querySelector('a[data-tab="live-map"]');
    if (liveMapTab) {
        liveMapTab.click();
        
        // Fly to location after a short delay to ensure map is loaded
        setTimeout(() => {
            if (liveMap) {
                liveMap.flyTo({ 
                    center: [lng, lat], 
                    zoom: 18, 
                    essential: true 
                });
                
                // Show a temporary marker
                if (tempPingMarker) {
                    tempPingMarker.remove();
                }
                
                const el = document.createElement('div');
                el.className = 'marker selected-location';
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = '#ff6b6b';
                el.style.border = '3px solid white';
                el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                
                tempPingMarker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(liveMap);
                
                // Remove temporary marker after 5 seconds
                setTimeout(() => {
                    if (tempPingMarker) {
                        tempPingMarker.remove();
                        tempPingMarker = null;
                    }
                }, 5000);
            }
        }, 500);
    }
}

// Function to refresh reports
async function refreshReports() {
    const refreshBtn = document.querySelector('.refresh-reports-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    }
    
    try {
        await loadReports();
        showSuccess('Reports refreshed successfully');
    } catch (error) {
        console.error('Error refreshing reports:', error);
        showError('Failed to refresh reports');
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }
}

// Resizable columns functionality
function initializeResizableColumns() {
    const table = document.getElementById('reports-table');
    if (!table) return;

    let isResizing = false;
    let currentHandle = null;
    let startX = 0;
    let startWidth = 0;
    let currentColumn = null;

    // Add event listeners to all resize handles
    function addResizeListeners() {
        const handles = table.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            if (handle.dataset.listenerAdded) return;
            
            handle.addEventListener('mousedown', startResize);
            handle.dataset.listenerAdded = 'true';
        });
    }

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        currentHandle = e.target;
        startX = e.clientX;
        currentColumn = currentHandle.parentElement;
        startWidth = currentColumn.offsetWidth;
        
        // Add visual feedback
        currentHandle.classList.add('resizing');
        table.classList.add('resizing');
        
        // Add global event listeners
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    }

    function resize(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
        
        // Set the width of the header cell
        currentColumn.style.width = newWidth + 'px';
        currentColumn.style.minWidth = newWidth + 'px';
        
        // Get the column index
        const columnIndex = Array.from(currentColumn.parentElement.children).indexOf(currentColumn);
        
        // Set the width of all cells in this column
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cell = row.children[columnIndex];
            if (cell) {
                cell.style.width = newWidth + 'px';
                cell.style.minWidth = newWidth + 'px';
            }
        });
    }

    function stopResize() {
        if (!isResizing) return;
        
        isResizing = false;
        
        // Remove visual feedback
        if (currentHandle) {
            currentHandle.classList.remove('resizing');
        }
        table.classList.remove('resizing');
        
        // Remove global event listeners
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        
        // Restore normal cursor and selection
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        currentHandle = null;
        currentColumn = null;
    }

    // Initialize resize listeners
    addResizeListeners();
    
    // Re-initialize when table content changes (for dynamic loading)
    const observer = new MutationObserver(() => {
        addResizeListeners();
    });
    
    observer.observe(table, { childList: true, subtree: true });
}

// After renderReportsTable, add this function:
window.renderReportMiniMaps = function() {
    document.querySelectorAll('.report-mini-map').forEach(div => {
        if (div.dataset.mapInitialized) return;
        const lat = parseFloat(div.getAttribute('data-lat'));
        const lng = parseFloat(div.getAttribute('data-lng'));
        if (!window.mapboxgl || isNaN(lat) || isNaN(lng)) return;
        div.dataset.mapInitialized = 'true';
        const map = new mapboxgl.Map({
            container: div,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: 16,
            interactive: false,
            attributionControl: false
        });
        new mapboxgl.Marker({color: '#3B82F6'})
            .setLngLat([lng, lat])
            .addTo(map);
        // Store map instance for cleanup
        div._miniMap = map;
    });
}

function applyReportFilters() {
    const type = document.querySelector('.type-filter')?.value || 'all';
    const status = document.querySelector('.status-filter')?.value || 'all';
    const dateFrom = document.querySelector('.date-from')?.value;
    const dateTo = document.querySelector('.date-to')?.value;

    let filtered = currentReports;

    // Type filter
    if (type !== 'all') {
        filtered = filtered.filter(r => r.type === type);
    }
    // Status filter
    if (status !== 'all') {
        filtered = filtered.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
    }
    // Date range filter
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(r => new Date(r.createdAt) >= fromDate);
    }
    if (dateTo) {
        const toDate = new Date(dateTo);
        // Add 1 day to include the end date
        toDate.setDate(toDate.getDate() + 1);
        filtered = filtered.filter(r => new Date(r.createdAt) < toDate);
    }
    renderReportsTable(filtered);
}

// Helper function to get user profile picture URL
config.getUserAvatarUrl = function(userId) {
    return userId ? config.getApiUrl(`/api/user/${userId}/profile-picture`) : config.DEFAULT_AVATAR;
};

// --- In-memory replies store ---
window.feedReplies = {};

// --- Modal helpers ---
function showReplyModal(postId, postMeta) {
  const modal = document.getElementById('replyModal');
  // Top section: show original post info in social thread style
  const postSection = modal.querySelector('.reply-modal-post');
  postSection.innerHTML = `
    <div class='reply-modal-post-header'>
      <img class='reply-modal-post-avatar' src='${postMeta.avatar}' alt='${postMeta.name}' />
      <div class='reply-modal-post-meta'>
        <span class='reply-modal-post-name'>${postMeta.name}</span>
        <span class='reply-modal-post-time'>${formatTimestamp(new Date(postMeta.timestamp))}</span>
      </div>
    </div>
    <div class='reply-modal-post-text'>${(postMeta.text||'').replace(/\n/g,'<br>')}</div>
  `;
  modal.style.display = 'flex';
  modal.dataset.postId = postId;
  document.getElementById('replyInput').value = '';
  // Reset image preview
  const imgPreview = document.getElementById('replyImagePreview');
  if (imgPreview) {
    imgPreview.style.display = 'none';
    imgPreview.src = '';
  }
  // Reset file input
  const fileInput = document.getElementById('replyImageInput');
  if (fileInput) fileInput.value = '';
  setTimeout(() => document.getElementById('replyInput').focus(), 100);
}
// Add image upload logic in modal
const replyImageInput = document.getElementById('replyImageInput');
if (replyImageInput) {
  replyImageInput.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const imgPreview = document.getElementById('replyImagePreview');
      imgPreview.src = ev.target.result;
      imgPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };
}
document.getElementById('submitReplyBtn').onclick = function() {
  const modal = document.getElementById('replyModal');
  const postId = modal.dataset.postId;
  const text = document.getElementById('replyInput').value.trim();
  const imgInput = document.getElementById('replyImageInput');
  let image = '';
  if (imgInput && imgInput.files[0]) {
    image = document.getElementById('replyImagePreview').src;
  }
  if (!text && !image) return document.getElementById('replyInput').focus();
  // Fake user
  const user = window.user || { firstName: 'You', avatar: 'assets/avatar.svg' };
  if (!window.feedReplies[postId]) window.feedReplies[postId] = [];
  window.feedReplies[postId].push({
    name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
    avatar: user.avatar || 'assets/avatar.svg',
    text,
    image,
    timestamp: Date.now(),
    reactions: {}
  });
  closeReplyModal();
  renderRecentActivityFeed();
};
function closeReplyModal() {
  const modal = document.getElementById('replyModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
function showRepliesModal(postId) {
  const modal = document.getElementById('repliesModal');
  const replies = window.feedReplies[postId] || [];
  const repliesList = document.getElementById('repliesList');
  repliesList.innerHTML = replies.length === 0 ? '<div style="text-align:center;color:#888;">No replies yet.</div>' : replies.map(r => `
    <div class='reply-item'>
      <img class='reply-item-avatar' src='${r.avatar}' alt='${r.name}' />
      <div class='reply-item-content'>
        <div class='reply-item-name'>${r.name}</div>
        <div class='reply-item-text'>${r.text}</div>
        <div class='reply-item-reactions'>${Object.entries(r.reactions||{}).map(([emoji, count]) => `<span class='reply-item-reaction'>${emoji} ${count}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');
  modal.style.display = 'flex';
  modal.dataset.postId = postId;
}
function closeRepliesModal() {
  const modal = document.getElementById('repliesModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Additional event listener setup for modal close buttons
function setupModalCloseButtons() {
  const closeReplyBtn = document.getElementById('closeReplyModal');
  const closeRepliesBtn = document.getElementById('closeRepliesModal');
  
  if (closeReplyBtn) {
    closeReplyBtn.onclick = closeReplyModal;
  }
  
  if (closeRepliesBtn) {
    closeRepliesBtn.onclick = closeRepliesModal;
  }
}

// Run setup after page loads
window.addEventListener('load', setupModalCloseButtons);
// --- Attach modal close events ---
document.addEventListener('DOMContentLoaded', () => {
  // Ensure close buttons work
  const closeReplyBtn = document.getElementById('closeReplyModal');
  const closeRepliesBtn = document.getElementById('closeRepliesModal');
  
  if (closeReplyBtn) {
    closeReplyBtn.addEventListener('click', closeReplyModal);
  }
  
  if (closeRepliesBtn) {
    closeRepliesBtn.addEventListener('click', closeRepliesModal);
  }
  
  // Also handle clicking outside the modal to close
  const replyModal = document.getElementById('replyModal');
  const repliesModal = document.getElementById('repliesModal');
  
  if (replyModal) {
    replyModal.addEventListener('click', function(e) {
      if (e.target === replyModal) {
        closeReplyModal();
      }
    });
  }
  
  if (repliesModal) {
    repliesModal.addEventListener('click', function(e) {
      if (e.target === repliesModal) {
        closeRepliesModal();
      }
    });
  }
  
  document.getElementById('submitReplyBtn').onclick = function() {
    const modal = document.getElementById('replyModal');
    const postId = modal.dataset.postId;
    const text = document.getElementById('replyInput').value.trim();
    if (!text) return document.getElementById('replyInput').focus();
    // Fake user
    const user = window.user || { firstName: 'You', avatar: 'assets/avatar.svg' };
    if (!window.feedReplies[postId]) window.feedReplies[postId] = [];
    window.feedReplies[postId].push({
      name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
      avatar: user.avatar || 'assets/avatar.svg',
      text,
      reactions: {}
    });
    closeReplyModal();
    renderRecentActivityFeed();
  };
});
