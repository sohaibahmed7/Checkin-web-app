let map = null;
let mapFull = null;
let liveMap = null;
let userMarker = null;
let selectedPingLocation = null; // Variable to store selected location {lat, lng}
let tempPingMarker = null; // Variable to hold the temporary marker
let pingMapPreview = null; // Variable to hold the modal map instance (moved to top-level)
let allPings = []; // Array to store all fetched pings
let pingsPerPage = 5; // Number of pings to display per page
let currentPingsDisplayed = 0; // Keep track of currently displayed pings

// Add event listeners for map filters (category and time)
// const mapCategoryButtons = document.querySelectorAll('.category-toggles button');
// const mapTimeFilter = document.querySelector('.time-filter');

// let currentMapCategory = 'all';
// let currentMapTime = '24h';
// function applyMapFilters() { ... }
// mapCategoryButtons.forEach(...);
// if (mapTimeFilter) { ... }

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve username from localStorage and update greeting
    const userName = localStorage.getItem('currentUserName') || 'User';
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

    // Helper function to get marker color based on type
    function getMarkerColor(type) {
        const colors = {
            suspicious: '#D32F2F', // Darker red for suspicious activity
            fire: '#E65100',      // Darker orange for fire alerts
            community: '#00796B', // Darker teal for community updates
            theft: '#F57C00',     // Darker yellow for theft
            noise: '#4A148C',     // Darker purple for noise complaints
            default: '#1A237E'    // Darker blue for default
        };
        return colors[type] || colors.default;
    }

    // Helper function to format timestamps
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

    // Function to create a modern ping marker
    function createModernPingMarker(ping, targetMap) {
        const el = document.createElement('div');
        console.log('Creating marker for type:', ping.type); // Debugging: Check the type being applied
        el.className = `marker ${ping.type}`;
        
        // Create popup with timestamp
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <div class="ping-tooltip">
                <span class="ping-category ${ping.type}">${ping.type}</span>
                <p class="ping-message">${ping.description}</p>
                <span class="ping-timestamp">${formatTimestamp(ping.timestamp)}</span>
            </div>
        `);

        // Create and return the marker
        const marker = new mapboxgl.Marker(el)
            .setLngLat(ping.coordinates)
            .setPopup(popup)
            .addTo(targetMap);
        
        return marker;
    }

    // Initialize home page map
    function initializeHomeMap() {
        const homeMapContainer = document.getElementById('map');
        if (!homeMapContainer) return;
        
        if (map) map.remove(); // Remove existing map instance before creating a new one
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-81.24, 43.02], // London, ON coordinates
            zoom: 13
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // The markers will be added by fetchPings and updateMapMarkers
    }

    // Initialize full map
    function initializeMapFull() {
        const mapContainer = document.getElementById('map-full');
        if (!mapContainer) return;
        
        if (mapFull) mapFull.remove(); // Remove existing map instance before creating a new one
        mapFull = new mapboxgl.Map({
            container: 'map-full',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-81.24, 43.02], // London, ON coordinates
            zoom: 13
        });
        
        // Add navigation controls
        mapFull.addControl(new mapboxgl.NavigationControl());

        // The markers will be added by fetchPings and updateMapMarkers
    }

    // Initialize live map
    function initializeLiveMap() {
        const liveMapContainer = document.getElementById('live-map-full');
        if (!liveMapContainer) return;
        
        if (liveMap) liveMap.remove(); // Remove existing map instance before creating a new one
        liveMap = new mapboxgl.Map({
            container: 'live-map-full',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-81.24, 43.02], // London, ON coordinates
            zoom: 13
        });
        
        // Add navigation controls
        liveMap.addControl(new mapboxgl.NavigationControl());

        // Initial markers will be added by fetchPings and updateMapMarkers
    }

    // Function to add markers to a given map instance (used by updateMapMarkers)
    // let currentMarkers = []; // Moved to be part of map instance

    function addMarkersToMap(mapInstance, pingsToAdd) {
        // This function is no longer directly used in updateMapMarkers as we're managing markers per map.
        // It was meant to be an internal helper, but current implementation directly adds in updateMapMarkers.
        // No changes needed here, just noting its original intent.
    }

    // Tab switching logic
    const tabs = document.querySelectorAll('.tab-pane');
    const tabLinks = document.querySelectorAll('.sidebar-nav a');

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
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

            // Load user settings when settings tab is clicked
            if (targetTab === 'settings') {
                loadUserSettings();
            }

            // Re-initialize maps when their tab becomes active
            if (targetTab === 'home') {
                initializeHomeMap();
                updateMapMarkers(map);
            } else if (targetTab === 'map-full') {
                initializeMapFull();
                updateMapMarkers(mapFull);
            } else if (targetTab === 'live-map') {
                initializeLiveMap();
                setupMapFilters({
                    mapInstance: liveMap,
                    feedContainerId: null,
                    categoryTogglesSelector: '#live-map .category-toggles',
                    timeFilterSelector: '#live-map .time-filter'
                });
                updateMapMarkers(liveMap);
            }

            // Scroll to top after switching tab
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    });

    // Add save settings handler
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.addEventListener('click', saveUserSettings);
    }

    // Activate default tab on load (e.g., home tab)
    document.querySelector('.sidebar-nav a[data-tab="home"]').click();

    // Initial fetch of pings on page load
    fetchPings();

    // Fetch pings every 30 seconds for real-time updates
    setInterval(fetchPings, 30000);

    // Category Filters for recent pings feed
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(button => {
        button.addEventListener('click', function() {
            categoryFilters.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const selectedCategory = this.getAttribute('data-category');
            const timeFilterValue = document.querySelector('.time-filter').value;
            const filteredPings = filterPings(selectedCategory, timeFilterValue);
            updatePingsFeed(filteredPings);
            updateMapMarkers(map, filteredPings); // Update map markers
        });
    });

    // Time Filter for recent pings feed
    const timeFilter = document.querySelector('.time-filter');
    if (timeFilter) {
        timeFilter.addEventListener('change', function(e) {
            const selectedCategory = document.querySelector('.category-filter.active').getAttribute('data-category');
            const filteredPings = filterPings(selectedCategory, e.target.value);
            updatePingsFeed(filteredPings);
            updateMapMarkers(map, filteredPings); // Update map markers
        });
    }

    // Update Ping Location function (for user's current location, if any)
    window.pingLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { longitude, latitude } = position.coords;
                if (userMarker) userMarker.setLngLat([longitude, latitude]);
                
                const activeMap = document.getElementById('map').classList.contains('active') ? map :
                                document.getElementById('live-map').classList.contains('active') ? liveMap :
                                mapFull;
                
                if (activeMap) {
                    activeMap.flyTo({
                        center: [longitude, latitude],
                        zoom: 15
                    });
                }
                
                const locationInput = document.getElementById('pin-location');
                if (locationInput) {
                    locationInput.value = `${latitude}, ${longitude}`;
                }
            });
        }
    };

    // Category Filters for live map (duplicate, removing the old one)
    // const categoryButtons = document.querySelectorAll('.live-map-controls .category-toggles button');
    // categoryButtons.forEach(button => {
    //     button.addEventListener('click', () => {
    //         categoryButtons.forEach(btn => btn.classList.remove('active'));
    //         button.classList.add('active');
            
    //         const category = button.getAttribute('data-category');
    //         const timeFilterValue = document.getElementById('live-time-filter').value;
    //         addMarkersToMap(liveMap, filterPings(category, timeFilterValue));
    //         updatePingsFeed(filterPings(category, timeFilterValue));
    //     });
    // });

    // Time filter for live map (duplicate, removing the old one)
    // const timeFilterLive = document.getElementById('live-time-filter');
    // if (timeFilterLive) {
    //     timeFilterLive.addEventListener('change', (e) => {
    //         const selectedCategory = document.querySelector('.live-map-controls .category-toggles button.active').getAttribute('data-category');
    //         addMarkersToMap(liveMap, filterPings(selectedCategory, e.target.value));
    //         updatePingsFeed(filterPings(selectedCategory, e.target.value));
    //     });
    // }

    // Place ping button for live map (duplicate, removing the old one)
    // const livePlacePingBtn = document.getElementById('live-place-ping');
    // if (livePlacePingBtn) {
    //     livePlacePingBtn.addEventListener('click', () => {
    //         if (!liveMap) return;

    //         liveMap.getCanvas().style.cursor = 'crosshair';
            
    //         const onClick = (e) => {
    //             const coordinates = e.lngLat;
                
    //             const el = document.createElement('div');
    //             el.className = 'marker new-ping';
                
    //             new mapboxgl.Marker(el)
    //                 .setLngLat(coordinates)
    //                 .addTo(liveMap);
                
    //             liveMap.getCanvas().style.cursor = '';
    //             liveMap.off('click', onClick);
                
    //             if (pingModal) {
    //                 document.getElementById('pin-location').value = `${coordinates.lat}, ${coordinates.lng}`;
    //                 pingModal.classList.add('active');
    //             }
    //         };
            
    //         liveMap.once('click', onClick);
    //     });
    // }

    // Add event listener for window resize
    window.addEventListener('resize', () => {
        if (map) map.resize();
        if (mapFull) mapFull.resize();
        if (liveMap) liveMap.resize();
    });

    // Function to fetch pings from the backend
    async function fetchPings() {
        try {
            const response = await fetch('http://localhost:3000/api/pings');
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
                    photo: ping.photo, // Include photo if available
                    user: ping.user // <-- Add this line to include user info
                };
            }); // Removed the .filter(ping => ping !== null) to prevent discarding pings

            console.log('Processed pings (allPings):', allPings); // Debugging: log processed pings

            updatePingsFeed(filterPings('all', 'all')); // Display all pings initially
            updateMapMarkers(map);       // Update home map
            updateMapMarkers(mapFull);   // Update full map
            updateMapMarkers(liveMap);   // Update live map
            
            // Reset current displayed pings and render for new data
            currentPingsDisplayed = 0;
            renderPings(allPings);
            // Initialize the activity chart only after pings are loaded
            initializeActivityChart();
            renderLiveMapPingDetails();
        } catch (error) {
            console.error('Error fetching pings:', error);
        }
    }

    // Refactored renderPings to accept a container parameter
    function renderPings(pingsToRender, containerId = 'recent-updates-container') {
        const container = document.getElementById(containerId) || document.querySelector(`.${containerId}`);
        if (!container) return;

        // Only show the 2 most recent pings in the updates section
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
            let userAvatar = user.profile_picture_url || 'assets/avatar.svg';
            if (userAvatar && userAvatar.startsWith('/uploads/')) {
                userAvatar = 'http://localhost:3000' + userAvatar;
            }
            const pingTypeIcon = getPingTypeIcon(ping.type);
            const pingTypeLabel = (ping.type || '').charAt(0).toUpperCase() + (ping.type || '').slice(1);
            const pingElement = document.createElement('div');
            pingElement.className = 'feed-item';
            pingElement.innerHTML = `
                <div class="feed-avatar">
                    <img src="${userAvatar}" alt="Profile Picture" onerror="this.onerror=null;this.src='assets/avatar.svg';">
                    <span class="status active"></span>
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
                        document.querySelector('a[data-tab="live-map"]').click();
                        if (liveMap) {
                            liveMap.flyTo({
                                center: [lng, lat],
                                zoom: 15
                            });
                        }
                    } else {
                        alert('Location not available for this ping.');
                    }
                });
                link.dataset.listenerAdded = 'true';
            }
        });
    }

    // For the live map ping details, always show the latest 5 pings
    function renderLiveMapPingDetails() {
        currentPingsDisplayed = 0;
        renderPings(allPings.slice(0, 5), 'ping-details-container');
    }

    // After fetchPings, also update live map ping details
    const originalFetchPings = fetchPings;
    fetchPings = async function() {
        await originalFetchPings.apply(this, arguments);
        renderLiveMapPingDetails();
    };

    // Also update when switching to live map tab
    const liveMapTab = document.querySelector('a[data-tab="live-map"]');
    if (liveMapTab) {
        liveMapTab.addEventListener('click', () => {
            renderLiveMapPingDetails();
        });
    }

    // Modify updatePingsFeed to use renderPings and filter by time range
    function updatePingsFeed(filteredPings) {
        console.log('updatePingsFeed received for filtering:', filteredPings.length, 'pings');
        // This function will now apply the time and category filters, then trigger rendering
        allPings = filteredPings; // Update the global allPings with the filtered set
        currentPingsDisplayed = 0; // Reset pagination for new filter
        renderPings(allPings); // Render the filtered subset
    }

    // Filter pings based on category and time range
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

    // Update map markers function (clears existing and adds new ones)
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

    // Initialize Activity Chart
    function initializeActivityChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

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

        const chart = new Chart(ctx, {
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

            chart.data.labels = newDates;
            chart.data.datasets[0].data = newAlerts;
            chart.update();
        }
    }

    // Reports Filtering
    function filterReports() {
        const searchInput = document.getElementById('report-search');
        const categoryFilter = document.getElementById('report-category-filter');
        const dateFilter = document.getElementById('report-date-filter');
        const statusFilter = document.getElementById('report-status-filter');

        const query = searchInput ? searchInput.value.toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : 'all';
        const dateRange = dateFilter ? dateFilter.value : 'all';
        const status = statusFilter ? statusFilter.value : 'all';

        const reportsTable = document.getElementById('reports-table');
        if (!reportsTable) return;

        const rows = reportsTable.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const id = row.cells[getColumnIndex('ID')].textContent.toLowerCase();
            const description = row.cells[getColumnIndex('Description')].textContent.toLowerCase();
            const reportCategory = row.cells[getColumnIndex('Category')].textContent.toLowerCase();
            const date = new Date(row.cells[getColumnIndex('Date')].textContent);
            const reportStatus = row.cells[getColumnIndex('Status')].textContent.toLowerCase();

            const matchesSearch = query === '' || id.includes(query) || description.includes(query);
            const matchesCategory = category === 'all' || reportCategory === category;
            const matchesStatus = status === 'all' || reportStatus === status;

            const now = new Date();
            let matchesDate = true;
            if (dateRange === '24h') {
                matchesDate = (now - date) < 24 * 60 * 60 * 1000;
            } else if (dateRange === '7d') {
                matchesDate = (now - date) < 7 * 24 * 60 * 60 * 1000;
            } else if (dateRange === '30d') {
                matchesDate = (now - date) < 30 * 24 * 60 * 60 * 1000;
            }

            if (matchesSearch && matchesCategory && matchesDate && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
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

    // Ping Map Preview Modal Logic
    const placePingBtn = document.getElementById('place-ping-fab');
    const placePingModal = document.getElementById('placePingModal');
    const closePingModal = document.getElementById('closePingModal');
    const pingMapPreviewContainer = document.getElementById('pingMapPreview');
    const mapLocationInput = document.getElementById('pin-location');

    if (placePingBtn) {
        placePingBtn.addEventListener('click', () => {
            placePingModal.classList.add('active');
            // Initialize map inside modal when it opens
            setTimeout(initializePingMapPreview, 100); // Small delay to ensure modal is visible
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

        pingMapPreview = new mapboxgl.Map({
            container: 'pingMapPreview',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-81.24, 43.02], // Default center
            zoom: 13,
            interactive: true // Ensure it's interactive for clicking
        });

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

        pingMapPreview.addControl(new mapboxgl.NavigationControl());

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
    }

    // Initial calls for map and feed updates (should be done after fetchPings)
    // updateMapMarkers(map); // Now handled by fetchPings
    // updateMapMarkers(mapFull); // Now handled by fetchPings
    // updateMapMarkers(liveMap); // Now handled by fetchPings
    // updatePingsFeed(allPings); // Now handled by fetchPings

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
                    previewImg.src = e.target.result;
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
            let avatarUrl = user.profile_picture_url || 'assets/avatar.svg';
            if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
                avatarUrl = 'http://localhost:3000' + avatarUrl;
            }
            profilePreviewAvatar.src = avatarUrl;
            // Add fallback for broken images
            profilePreviewAvatar.onerror = function() {
                this.onerror = null;
                this.src = 'assets/avatar.svg';
            };
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
                
                // Update greeting
                updateGreeting();
                
                // Update user avatar in top bar and dropdown
                const userAvatarImg = document.querySelector('#userAvatar img');
                if (userAvatarImg) {
                    userAvatarImg.src = updatedUser.profile_picture_url || 'assets/avatar.svg';
                }
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

    // Set greeting with user's full name
    function updateGreeting() {
        const greetingText = document.getElementById('greeting-text');
        if (greetingText) {
            const hour = new Date().getHours();
            let greeting = 'Good Morning';
            if (hour >= 12 && hour < 18) {
                greeting = 'Good Afternoon';
            } else if (hour >= 18) {
                greeting = 'Good Evening';
            }
            const user = JSON.parse(localStorage.getItem('user'));
            const name = user && user.name ? user.name : 'User';
            greetingText.textContent = `${greeting}, ${name}!`;
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
            localStorage.removeItem('currentUserName');
            // Redirect to home page
            window.location.href = '../index.html';
        });
    }

    // Toggle dropdown on avatar click
    userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });

    // Handle dropdown item clicks
    userDropdown.addEventListener('click', (e) => {
        const target = e.target.closest('.dropdown-item');
        if (target) {
            const targetTab = target.getAttribute('data-tab');
            if (targetTab) {
                // Find and click the corresponding tab link
                const tabLink = document.querySelector(`a[data-tab="${targetTab}"]`);
                if (tabLink) {
                    tabLink.click();
                }
            }
            userDropdown.style.display = 'none';
        }
    });

    // Place Ping Modal Address Search Logic
    const pingAddressSearch = document.getElementById('pingAddressSearch');
    const pingAddressSuggestions = document.getElementById('pingAddressSuggestions');
    let pingMapPreviewInstance = null;

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

}); 

// Helper function to compare only year, month, and day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getPingTypeIcon(type) {
    switch(type) {
        case 'fire': return '<i class="fas fa-fire" style="color:#e53e3e;"></i>';
        case 'suspicious': return '<i class="fas fa-exclamation-triangle" style="color:#ffc107;"></i>';
        case 'community': return '<i class="fas fa-users" style="color:#3182ce;"></i>';
        case 'theft': return '<i class="fas fa-user-secret" style="color:#f57c00;"></i>';
        case 'noise': return '<i class="fas fa-bullhorn" style="color:#4a148c;"></i>';
        default: return '<i class="fas fa-map-marker-alt" style="color:#1a237e;"></i>';
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
            renderPings(filtered);
        }
    }

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-category');
            applyFilters();
        });
    });
    if (timeFilter) {
        timeFilter.addEventListener('change', function() {
            currentTime = this.value;
            applyFilters();
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

// Full map tab filters
setupMapFilters({
    mapInstance: mapFull,
    feedContainerId: null, // If you want to update a feed here, provide its container ID
    categoryTogglesSelector: '#map .map-filters-left .category-filter',
    timeFilterSelector: '#map .map-filters-right .time-filter'
});

// Live map tab filters
setupMapFilters({
    mapInstance: liveMap,
    feedContainerId: null, // If you want to update a feed here, provide its container ID
    categoryTogglesSelector: '#live-map .category-toggles',
    timeFilterSelector: '#live-map .time-filter'
});

// After fetchPings, also update live map ping details
const originalFetchPings = fetchPings;
fetchPings = async function() {
    await originalFetchPings.apply(this, arguments);
    renderLiveMapPingDetails();
};

// Also update when switching to live map tab
const liveMapTab = document.querySelector('a[data-tab="live-map"]');
if (liveMapTab) {
    liveMapTab.addEventListener('click', () => {
        renderLiveMapPingDetails();
    });
} 