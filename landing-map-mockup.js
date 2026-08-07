/**
 * Landing page map mockup - static Mapbox image with interactive ping overlays.
 */
(function () {
    const MAP_BOUNDS_PAD = 0.012;
    const MAP_STYLE = 'mapbox/streets-v12';

    const DEMO_PINGS = [
        {
            id: 'ping-1',
            type: 'break-enter',
            coordinates: [-79.778, 43.728],
            description: 'A resident reported signs of forced entry at a rear patio door. Suspects were wearing black hoodies and left in a dark BMW.',
            user: { name: 'Prisha Metha', avatar: 'pages/assets/prisha-metha.png' },
            timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000)
        },
        {
            id: 'ping-2',
            type: 'suspicious',
            coordinates: [-79.745, 43.726],
            description: 'Individual wearing a gray hoodie and dark jeans seen loitering near several homes. Left briefly in a silver Toyota Corolla.',
            user: { name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
        },
        {
            id: 'ping-3',
            type: 'fire',
            coordinates: [-79.772, 43.708],
            description: 'Smoke visible from a backyard near Williams Pkwy. Fire department has been notified and is responding.',
            user: { name: 'Mike Chen', avatar: 'https://randomuser.me/api/portraits/men/52.jpg' },
            timestamp: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
            id: 'ping-4',
            type: 'other',
            coordinates: [-79.748, 43.710],
            description: 'Vehicle reported stolen from driveway. Blue Honda Civic with partial license plate visible.',
            user: { name: 'Lisa Park', avatar: 'https://randomuser.me/api/portraits/women/26.jpg' },
            timestamp: new Date(Date.now() - 60 * 60 * 1000)
        },
        {
            id: 'ping-5',
            type: 'suspicious',
            coordinates: [-79.765, 43.722],
            description: 'Unknown person taking photos of homes on Valleyway Dr. Wearing dark clothing and acting suspiciously.',
            user: { name: 'James Wilson', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
            timestamp: new Date(Date.now() - 2 * 60 * 1000)
        },
        {
            id: 'ping-6',
            type: 'break-enter',
            coordinates: [-79.755, 43.714],
            description: 'Garage door found open with tools scattered outside. Neighbours asked to check security cameras.',
            user: { name: 'Anita Desai', avatar: 'https://randomuser.me/api/portraits/women/89.jpg' },
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
            id: 'ping-7',
            type: 'fire',
            coordinates: [-79.768, 43.705],
            description: 'Small brush fire reported near a park trail. Crews on scene and area being cordoned off.',
            user: { name: 'David Kim', avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
            id: 'ping-8',
            type: 'other',
            coordinates: [-79.752, 43.720],
            description: 'Hit-and-run reported on Fandango Dr. White sedan fled the scene heading east.',
            user: { name: 'Emily Torres', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
        },
        {
            id: 'ping-9',
            type: 'suspicious',
            coordinates: [-79.780, 43.715],
            description: 'Person going door-to-door claiming to sell security systems. No company ID visible.',
            user: { name: 'Robert Singh', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
            timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000)
        },
        {
            id: 'ping-10',
            type: 'break-enter',
            coordinates: [-79.742, 43.718],
            description: 'Attempted window entry on a ground-floor unit. Police notified; please secure side gates.',
            user: { name: 'David Nathan', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
            id: 'ping-11',
            type: 'fire',
            coordinates: [-79.760, 43.730],
            description: 'Barbecue flare-up spread to a fence line. Quick response prevented further damage.',
            user: { name: 'Karen Lee', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
            timestamp: new Date(Date.now() - 45 * 60 * 1000)
        },
        {
            id: 'ping-12',
            type: 'other',
            coordinates: [-79.770, 43.712],
            description: 'Package theft from front porch captured on doorbell camera. Suspect on bicycle.',
            user: { name: 'Chris Patel', avatar: 'https://randomuser.me/api/portraits/men/41.jpg' },
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
        }
    ];

    const PING_ICONS = {
        suspicious: 'pages/assets/pings/ping-suspicious.png',
        'break-enter': 'pages/assets/pings/ping-break-enter.png',
        fire: 'pages/assets/pings/ping-fire.png',
        other: 'pages/assets/pings/ping-other.png'
    };

    let mapBounds = null;
    let mapContainer = null;
    let popupLayer = null;
    let markersLayer = null;
    let markerElements = [];
    let activeCategory = 'all';
    let activePopupId = null;
    const POPUP_EDGE_PADDING = 10;
    const POPUP_PIN_GAP = 12;

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

    function formatPingTypeDisplay(type) {
        switch (type) {
            case 'suspicious': return 'Suspicious';
            case 'break-enter': return 'Break & Enter';
            case 'fire': return 'Fire';
            case 'other': return 'Other';
            default: return 'Other';
        }
    }

    function getPingTypeIcon(type) {
        const src = PING_ICONS[type] || PING_ICONS.other;
        const label = formatPingTypeDisplay(type);
        return `<img src="${src}" alt="${label}" class="ping-png-icon">`;
    }

    function getUserName(ping) {
        return ping.user?.name || 'Community User';
    }

    function getUserAvatar(ping) {
        if (ping.user?.avatar) return ping.user.avatar;
        return (typeof config !== 'undefined' && config.DEFAULT_AVATAR) ? config.DEFAULT_AVATAR : 'pages/dashboard/assets/avatar.svg';
    }

    function getPingBounds() {
        let west = Infinity;
        let south = Infinity;
        let east = -Infinity;
        let north = -Infinity;

        DEMO_PINGS.forEach(ping => {
            const [lng, lat] = ping.coordinates;
            west = Math.min(west, lng);
            south = Math.min(south, lat);
            east = Math.max(east, lng);
            north = Math.max(north, lat);
        });

        return {
            west: west - MAP_BOUNDS_PAD,
            south: south - MAP_BOUNDS_PAD,
            east: east + MAP_BOUNDS_PAD,
            north: north + MAP_BOUNDS_PAD
        };
    }

    function lngLatToMercator(lng, lat) {
        const x = (lng + 180) / 360;
        const sinLat = Math.sin((lat * Math.PI) / 180);
        const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
        return { x, y };
    }

    function lngLatToPercent(lng, lat, bounds) {
        const point = lngLatToMercator(lng, lat);
        const sw = lngLatToMercator(bounds.west, bounds.south);
        const ne = lngLatToMercator(bounds.east, bounds.north);

        return {
            left: ((point.x - sw.x) / (ne.x - sw.x)) * 100,
            top: ((ne.y - point.y) / (ne.y - sw.y)) * 100
        };
    }

    function getMapDimensions(container) {
        const width = Math.min(Math.max(container.clientWidth || 640, 320), 640);
        const height = Math.min(Math.max(container.clientHeight || 420, 240), 420);
        return { width, height };
    }

    function buildStaticMapUrl(bounds, width, height) {
        const bbox = `[${bounds.west},${bounds.south},${bounds.east},${bounds.north}]`;
        const params = new URLSearchParams({
            access_token: config.MAPBOX_ACCESS_TOKEN,
            attribution: 'false',
            logo: 'false'
        });
        return `https://api.mapbox.com/styles/v1/${MAP_STYLE}/static/${bbox}/${width}x${height}@2x?${params.toString()}`;
    }

    function buildPopupHtml(ping) {
        return `
            <div class="ping-tooltip">
                <span class="ping-category ${ping.type}">${formatPingTypeDisplay(ping.type)}</span>
                <p class="ping-message">${ping.description}</p>
                <div class="ping-meta-line">
                    <img src="${getUserAvatar(ping)}" alt="" class="ping-meta-avatar" onerror="this.onerror=null;this.src='pages/dashboard/assets/avatar.svg';">
                    <span>By ${getUserName(ping)}, ${formatTimestamp(ping.timestamp)}</span>
                </div>
            </div>
        `;
    }

    function getFilteredPings() {
        if (activeCategory === 'all') return DEMO_PINGS;
        return DEMO_PINGS.filter(ping => ping.type === activeCategory);
    }

    function closeAllPopups() {
        markerElements.forEach(({ el }) => el.classList.remove('is-active'));
        activePopupId = null;
        if (popupLayer) {
            popupLayer.classList.remove('is-visible', 'is-below');
            popupLayer.hidden = true;
            popupLayer.innerHTML = '';
            popupLayer.style.display = '';
            popupLayer.style.visibility = '';
            popupLayer.style.left = '';
            popupLayer.style.top = '';
        }
    }

    function positionPopup(markerEntry) {
        const pin = markerEntry.el.querySelector('.landing-static-marker-pin');
        if (!popupLayer || !pin || !mapContainer) return;

        const containerRect = mapContainer.getBoundingClientRect();
        const pinRect = pin.getBoundingClientRect();

        popupLayer.classList.remove('is-below');
        popupLayer.style.visibility = 'hidden';
        popupLayer.style.display = 'block';

        const popupWidth = popupLayer.offsetWidth;
        const popupHeight = popupLayer.offsetHeight;

        const pinCenterX = pinRect.left - containerRect.left + (pinRect.width / 2);
        const pinTop = pinRect.top - containerRect.top;
        const pinBottom = pinRect.bottom - containerRect.top;

        let left = pinCenterX - (popupWidth / 2);
        left = Math.max(
            POPUP_EDGE_PADDING,
            Math.min(left, containerRect.width - popupWidth - POPUP_EDGE_PADDING)
        );

        // Prefer showing the popup above the pin, but only if there's actually
        // room for it - otherwise flip below. Whichever side has more space wins
        // when neither fully fits, and the result is always clamped inside the
        // map so the popup is never cut off by the map's edges.
        const spaceAbove = pinTop;
        const spaceBelow = containerRect.height - pinBottom;
        const neededSpace = popupHeight + POPUP_PIN_GAP;

        let top;
        let showBelow;
        if (spaceAbove >= neededSpace || spaceAbove >= spaceBelow) {
            top = pinTop - popupHeight - POPUP_PIN_GAP;
            showBelow = false;
        } else {
            top = pinBottom + POPUP_PIN_GAP;
            showBelow = true;
        }

        top = Math.max(
            POPUP_EDGE_PADDING,
            Math.min(top, containerRect.height - popupHeight - POPUP_EDGE_PADDING)
        );

        popupLayer.classList.toggle('is-below', showBelow);
        popupLayer.style.left = `${left}px`;
        popupLayer.style.top = `${top}px`;
        popupLayer.style.setProperty('--arrow-left', `${pinCenterX - left}px`);
        popupLayer.style.display = '';
        popupLayer.style.visibility = '';
    }

    function openPingPopup(pingId) {
        closeAllPopups();
        const marker = markerElements.find(item => item.ping.id === pingId);
        if (!marker || !popupLayer) return;

        marker.el.classList.add('is-active');
        activePopupId = pingId;
        popupLayer.innerHTML = buildPopupHtml(marker.ping);
        popupLayer.hidden = false;
        popupLayer.classList.add('is-visible');
        positionPopup(marker);
    }

    function createMarkerElement(ping) {
        const position = lngLatToPercent(ping.coordinates[0], ping.coordinates[1], mapBounds);
        const el = document.createElement('div');
        el.className = `landing-static-marker marker ${ping.type}`;
        el.dataset.pingId = ping.id;
        el.style.left = `${position.left}%`;
        el.style.top = `${position.top}%`;
        el.innerHTML = `
            <button type="button" class="landing-static-marker-pin" aria-label="${formatPingTypeDisplay(ping.type)} ping by ${getUserName(ping)}">
                ${getPingTypeIcon(ping.type)}
            </button>
        `;

        const pin = el.querySelector('.landing-static-marker-pin');
        pin.addEventListener('click', (event) => {
            event.stopPropagation();
            if (activePopupId === ping.id) {
                closeAllPopups();
            } else {
                openPingPopup(ping.id);
            }
        });

        el.addEventListener('click', (event) => event.stopPropagation());

        return el;
    }

    function refreshMarkers() {
        if (!markersLayer) return;
        markersLayer.innerHTML = '';
        markerElements = [];

        getFilteredPings().forEach(ping => {
            const el = createMarkerElement(ping);
            markersLayer.appendChild(el);
            markerElements.push({ ping, el });
        });
    }

    function focusPingOnMap(ping) {
        openPingPopup(ping.id);
    }

    function renderPingList() {
        const list = document.getElementById('landing-ping-list');
        if (!list) return;

        const pings = getFilteredPings().slice(0, 5);
        const fallbackAvatar = (typeof config !== 'undefined' && config.DEFAULT_AVATAR) ? config.DEFAULT_AVATAR : 'pages/dashboard/assets/avatar.svg';

        list.innerHTML = pings.map(ping => `
            <div class="landing-feed-item" data-ping-id="${ping.id}">
                <div class="landing-feed-avatar">
                    <img src="${getUserAvatar(ping)}" alt="${getUserName(ping)}" onerror="this.onerror=null;this.src='${fallbackAvatar}';">
                </div>
                <div class="landing-feed-content">
                    <div class="landing-feed-header">
                        <span class="landing-feed-user"><strong>${getUserName(ping)}</strong></span>
                        <div class="landing-feed-meta">
                            <span class="landing-feed-time">${formatTimestamp(ping.timestamp)}</span>
                            <span class="landing-feed-type">${getPingTypeIcon(ping.type)} <span>${formatPingTypeDisplay(ping.type)}</span></span>
                        </div>
                    </div>
                    <p class="landing-feed-text">${ping.description}</p>
                    <button type="button" class="landing-view-on-map" data-ping-id="${ping.id}">View on Map</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.landing-view-on-map').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const ping = DEMO_PINGS.find(p => p.id === btn.dataset.pingId);
                if (ping) focusPingOnMap(ping);
            });
        });

        list.querySelectorAll('.landing-feed-item').forEach(item => {
            item.addEventListener('click', (event) => {
                if (event.target.closest('.landing-view-on-map')) return;
                const ping = DEMO_PINGS.find(p => p.id === item.dataset.pingId);
                if (ping) focusPingOnMap(ping);
            });
        });
    }

    function setupFilters() {
        document.querySelectorAll('.landing-category-toggles button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.landing-category-toggles button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategory = btn.dataset.category;
                closeAllPopups();
                refreshMarkers();
                renderPingList();
            });
        });
    }

    function renderStaticMap(container) {
        mapBounds = getPingBounds();
        const { width, height } = getMapDimensions(container);

        container.innerHTML = '';
        container.classList.add('landing-static-map');

        const img = document.createElement('img');
        img.className = 'landing-static-map-img';
        img.alt = 'Neighbourhood safety map';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = buildStaticMapUrl(mapBounds, width, height);

        markersLayer = document.createElement('div');
        markersLayer.className = 'landing-static-markers';
        markersLayer.setAttribute('aria-hidden', 'false');

        popupLayer = document.createElement('div');
        popupLayer.className = 'landing-static-popup';
        popupLayer.hidden = true;
        popupLayer.addEventListener('click', (event) => event.stopPropagation());

        mapContainer = container;
        container.appendChild(img);
        container.appendChild(markersLayer);
        container.appendChild(popupLayer);

        container.addEventListener('click', () => closeAllPopups());

        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(() => {
                if (!activePopupId) return;
                const marker = markerElements.find(item => item.ping.id === activePopupId);
                if (marker) positionPopup(marker);
            });
            observer.observe(container);
        }
    }

    function initLandingMapMockup() {
        const container = document.getElementById('landing-map-mockup');
        if (!container || typeof config === 'undefined' || !config.MAPBOX_ACCESS_TOKEN) {
            return;
        }

        renderStaticMap(container);
        refreshMarkers();
        renderPingList();
        setupFilters();
    }

    document.addEventListener('DOMContentLoaded', initLandingMapMockup);
})();
