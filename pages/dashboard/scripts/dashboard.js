let map = null;
let liveMap = null;
let userMarker = null;
let selectedPingLocation = null; // Variable to store selected location {lat, lng}
let tempPingMarker = null; // Variable to hold the temporary marker
let pingMapPreview = null; // Variable to hold the modal map instance (moved to top-level)
let allPings = []; // Array to store all fetched pings
let activityChart = null; // Global variable to track the activity chart instance
let pendingFlyTo = null; // Store flyTo target if switching tabs

window.addEventListener('pageshow', () => {
    if (!localStorage.getItem('user')) {
        window.location.href = '/pages/auth/login.html';
    }
});

// Global function to create a modern ping marker
function createModernPingMarker(ping, targetMap) {
    const el = document.createElement('div');
    console.log('Creating marker for type:', ping.type); // Debugging: Check the type being applied
    el.className = `marker ${ping.type}`;
    
    // Create popup with timestamp, user, and image indicator
    const userName = ping.user && ping.user.name ? ping.user.name : 'Community User';
    let metaLine = `By ${userName}, ${formatTimestamp(ping.timestamp)}`;
    let imageIndicator = ping.photoPath ? '<span class="ping-image-indicator-top"><i class="fas fa-image"></i></span>' : '';
    const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true
    }).setHTML(`
        <div class="ping-tooltip">
            ${imageIndicator}
            <span class="ping-category ${ping.type}">${formatPingTypeDisplay(ping.type)}</span>
            <p class="ping-message">${ping.description}</p>
            <div class="ping-meta-line">${metaLine}</div>
        </div>
    `);

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
function renderPings(pingsToRender, containerId = 'recent-updates-container') {
    const container = document.getElementById(containerId) || document.querySelector(`.${containerId}`);
    if (!container) {
        console.warn(`renderPings: Container '${containerId}' not found in DOM.`);
        return;
    }

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
        const user = ping.user || {};
        const userName = user.name || 'Community User';
        // Ensure the profile picture URL is absolute if needed
        let userAvatar = user._id ? `http://localhost:3000/api/user/${user._id}/profile-picture` : 'assets/avatar.svg';
        if (userAvatar && userAvatar.startsWith('/uploads/')) {
            userAvatar = 'http://localhost:3000' + userAvatar;
        }
        const pingTypeIcon = getPingTypeIcon(ping.type);
        const pingTypeLabel = formatPingTypeDisplay(ping.type);
        const pingElement = document.createElement('div');
        pingElement.className = 'feed-item';
        pingElement.innerHTML = `
            <div class="feed-avatar">
                <img src="${userAvatar}" alt="Profile Picture" onerror="this.onerror=null;this.src='assets/avatar.svg';">
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
                <div class="feed-actions">
                    <a href="#" class="view-on-map" data-lat="${ping.coordinates ? ping.coordinates[1] : ''}" data-lng="${ping.coordinates ? ping.coordinates[0] : ''}">View on Map</a>
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
}

// Global function to fetch pings from the backend
async function fetchPings() {
    try {
        // Get the user's neighborhoodId
        const user = JSON.parse(localStorage.getItem('user'));
        let neighborhoodId = null;
        if (user && user._id) {
            const nRes = await fetch(`http://localhost:3000/api/user/neighborhood/${user._id}`);
            if (nRes.ok) {
                const neighborhood = await nRes.json();
                if (neighborhood && neighborhood._id) {
                    neighborhoodId = neighborhood._id;
                }
            }
        }
        const response = await fetch(
            neighborhoodId
                ? `http://localhost:3000/api/pings?neighborhoodId=${neighborhoodId}`
                : 'http://localhost:3000/api/pings'
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
                photoPath: ping.photoPath, // Include photo if available
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
        updateMapMarkers(liveMap, liveFiltered, liveCategory);   // Update live map with filtered data
        
        // Reset current displayed pings and render for new data
        currentPingsDisplayed = 0;
        // Initialize the activity chart only after pings are loaded
        initializeActivityChart();
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
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#3B82F6',
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
    const userName = user && user.name ? user.name : 'User';
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
        let avatarUrl = user._id ? `http://localhost:3000/api/user/${user._id}/profile-picture` : 'assets/avatar.svg';
        greetingBarAvatar.src = avatarUrl;
        greetingBarAvatar.onerror = function() { this.onerror = null; this.src = avatarUrl; };
    }

    // Initialize Mapbox with the correct token
    mapboxgl.accessToken = 'pk.eyJ1IjoiYW5zaG1ha2thciIsImEiOiJjbTl2ams5OGcwbGwwMm1vbGpiaDduczg1In0.4yzUyxSxV9lHLtbRQfjdWA';
    
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
            const response = await fetch(`http://localhost:3000/api/user/neighborhood/${user._id}`);
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
        if (!liveMapContainer) return;
        if (liveMap) liveMap.remove();
        const neighborhoodData = await getNeighborhoodData();
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
        liveMap = new mapboxgl.Map(mapOptions);
        liveMap.scrollZoom.disable();
        liveMap.touchZoomRotate.disable();
        liveMap.addControl(new mapboxgl.NavigationControl());
        if (bounds) {
            liveMap.on('load', () => {
                liveMap.fitBounds(bounds, { padding: 0, animate: false });
                const minZoom = liveMap.getZoom();
                liveMap.setMinZoom(minZoom);
                liveMap.setMaxZoom(20);
            });
        }
        // The markers will be added by fetchPings and updateMapMarkers
    }

    // Greeting messages for each tab
    const tabGreetings = {
        home: {
            greeting: (userName, time) => `${time}, ${userName}!`,
            subtitle: 'Welcome back to your dashboard'
        },
        'live-map': {
            greeting: () => 'Welcome to your Neighbourhood Map!',
            subtitle: 'See live updates and activity in your area'
        },
        chat: {
            greeting: () => 'Community Chat',
            subtitle: 'Connect and communicate with your neighbors'
        },
        reports: {
            greeting: () => 'Reports Overview',
            subtitle: 'View and manage all reports here'
        },
        contacts: {
            greeting: () => 'Key Contacts',
            subtitle: 'Important contacts for your community'
        },
        settings: {
            greeting: () => 'Settings',
            subtitle: 'Manage your account and preferences'
        }
    };

    function updateGreetingForTab(tab) {
        const greetingText = document.getElementById('greeting-text');
        const subtitle = greetingText && greetingText.nextElementSibling;
        const user = JSON.parse(localStorage.getItem('user'));
        const userName = user && user.name ? user.name : 'User';
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
                        liveMap.flyTo({ center: [pendingFlyTo.lng, pendingFlyTo.lat], zoom: 20, essential: true });
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
            const formData = new FormData();
            formData.append('description', description);
            formData.append('type', category);
            formData.append('lat', lat);
            formData.append('lng', lng);
            if (photo) formData.append('photo', photo);
            if (userId) formData.append('userId', userId);
            try {
                const response = await fetch('http://localhost:3000/api/pings', {
                    method: 'POST',
                    body: formData
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

    function getColumnIndex(column) {
        const headerCells = document.querySelectorAll('#reports-table thead th');
        for (let i = 0; i < headerCells.length; i++) {
            if (headerCells[i].textContent.trim() === column) {
                return i;
            }
        }
        return -1; // Column not found
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

    function updateChatWindow(chatId) {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            // Placeholder: In a real app, fetch chat messages for chatId and populate
            chatWindow.innerHTML = `
                <div class="chat-window-header">
                    <div class="chat-title-avatar">
                        <img src="assets/avatar.svg" alt="Chat User">
                    </div>
                    <div class="chat-title-info">
                        <h3>Community Chat ${chatId}</h3>
                        <span class="online-count">5 Online</span>
                    </div>
                    <button class="close-chat"><i class="fas fa-times"></i></button>
                </div>
                <div class="messages-container">
                    <!-- Sample messages -->
                    <div class="message-group">
                        <div class="message received">
                            <div class="message-avatar">
                                <img src="assets/avatar.svg" alt="User A">
                            </div>
                            <div class="message-content">
                                <div class="message-author">User A <span class="message-time">10:00 AM</span></div>
                                <p>Hello everyone!</p>
                                <div class="message-reactions">
                                    <div class="reaction-badge" data-emoji="👍" data-count="2">👍 <span>2</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="message sent">
                            <div class="message-content">
                                <div class="message-author">You <span class="message-time">10:05 AM</span></div>
                                <p>Hi User A!</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" placeholder="Type a message...">
                    <button class="attach-button"><i class="fas fa-paperclip"></i></button>
                    <button class="send-button"><i class="fas fa-paper-plane"></i></button>
                </div>
            `;

            // Add listener to close button
            chatWindow.querySelector('.close-chat').addEventListener('click', () => {
                chatWindow.classList.remove('active');
            });
            chatWindow.classList.add('active');
        }
    }

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
            mapLocationInput.value = ''; // Clear location input
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
                el.className = 'marker';
                el.style.backgroundColor = 'var(--primary-color)';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 0 0 2px var(--primary-color)';

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
                    let avatarUrl = user._id ? `http://localhost:3000/api/user/${user._id}/profile-picture` : 'assets/avatar.svg';
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

        if (profilePreviewAvatar) {
            let avatarUrl = user._id ? `http://localhost:3000/api/user/${user._id}/profile-picture` : 'assets/avatar.svg';
            profilePreviewAvatar.src = avatarUrl;
            profilePreviewAvatar.onerror = function() { this.onerror = null; this.src = avatarUrl; };
        }
        if (profilePreviewName) {
            profilePreviewName.textContent = user.name;
        }
        if (profilePreviewEmail) {
            profilePreviewEmail.textContent = user.email;
        }

        // Update form fields
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        if (nameInput) nameInput.value = user.name;
        if (emailInput) emailInput.value = user.email;
        if (phoneInput) phoneInput.value = user.number;
    }

    async function saveUserSettings(event) {
        event.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('No user data found. Please log in again.');
            window.location.href = '../login.html';
            return;
        }
        if (!user._id) {
            alert('User ID is missing. Please log out and log in again.');
            window.location.href = '../login.html';
            return;
        }

        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const profilePictureInput = document.getElementById('profilePicture');

        const formData = new FormData();
        formData.append('userId', user._id);
        formData.append('name', nameInput.value);
        formData.append('number', phoneInput.value);
        if (profilePictureInput.files.length > 0) {
            formData.append('profile_picture', profilePictureInput.files[0]);
        }

        try {
            const response = await fetch('http://localhost:3000/api/user/settings', {
                method: 'PUT',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Update localStorage with new user data
                const updatedUser = { ...user, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Reload settings to show updated data
                loadUserSettings();
                
                // Show success message
                alert('Settings saved successfully!');
            } else {
                alert(data.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred while saving settings');
        }
    }

    // Call on page load
    updateGreeting();

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
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear user data from localStorage
            localStorage.removeItem('user');
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
                    await fetch('http://localhost:3000/api/logout', { method: 'POST', credentials: 'include' });
                } catch (e) {
                    // Ignore errors for now
                }
                // Clear localStorage
                localStorage.removeItem('user');
                // Redirect to login
                window.location.href = '/pages/auth/login.html';
            });
        }
    })();
}); 

// Helper function to compare only year, month, and day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getPingTypeIcon(type) {
    switch(type) {
        case 'suspicious': return '<i class="fas fa-exclamation-triangle" style="color:#ffc107;"></i>';
        case 'break-enter': return '<i class="fas fa-lock" style="color:#9c27b0;"></i>';
        case 'fire': return '<i class="fas fa-fire" style="color:#e53e3e;"></i>';
        case 'other': return '<i class="fas fa-map-marker-alt" style="color:#4caf50;"></i>';
        default: return '<i class="fas fa-map-marker-alt" style="color:#4caf50;"></i>';
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