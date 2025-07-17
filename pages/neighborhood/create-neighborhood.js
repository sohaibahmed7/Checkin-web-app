// Access control: Only allow if user is a moderator and has no neighborhood
(function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/pages/auth/login.html';
        return;
    }
    if (!user.is_moderator || user.neighborhood_id) {
        window.location.href = '/pages/dashboard/index.html';
        return;
    }
})();

// Copy invite code to clipboard
function copyInviteCode() {
    const code = document.getElementById('inviteCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Invite code copied to clipboard!');
    });
}

// Fetch unique invite code from backend
async function fetchInviteCode() {
    try {
        const response = await fetch(config.getApiUrl('/api/neighborhood/generate-invite-code'), {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('inviteCode').textContent = data.inviteCode;
        } else {
            document.getElementById('inviteCode').textContent = 'Error';
        }
    } catch (e) {
        document.getElementById('inviteCode').textContent = 'Error';
    }
}
fetchInviteCode();

// Address search logic (debounced, Mapbox)
const addressSearch = document.getElementById('addressSearch');
const addressSuggestions = document.getElementById('addressSuggestions');
let selectedAddress = null;

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function fetchAddressSuggestions(query) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=pk.eyJ1IjoiYW5zaG1ha2thciIsImEiOiJjbTl2ams5OGcwbGwwMm1vbGpiaDduczg1In0.4yzUyxSxV9lHLtbRQfjdWA&autocomplete=true&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features || [];
}

function renderSuggestions(suggestions) {
    addressSuggestions.innerHTML = '';
    if (!suggestions.length) return;
    suggestions.forEach(feature => {
        const item = document.createElement('li');
        item.textContent = feature.place_name;
        item.addEventListener('mousedown', () => {
            addressSearch.value = feature.place_name;
            addressSuggestions.innerHTML = '';
            selectedAddress = feature;
            // Optionally, center map on this address
            if (map && feature.center) {
                map.flyTo({ center: feature.center, zoom: 15 });
            }
        });
        addressSuggestions.appendChild(item);
    });
}

if (addressSearch) {
    addressSearch.addEventListener('input', debounce(async function() {
        const query = this.value.trim();
        if (query.length < 3) {
            addressSuggestions.innerHTML = '';
            return;
        }
        const suggestions = await fetchAddressSuggestions(query);
        renderSuggestions(suggestions);
    }, 350));
}

// Mapbox boundary drawing
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5zaG1ha2thciIsImEiOiJjbTl2ams5OGcwbGwwMm1vbGpiaDduczg1In0.4yzUyxSxV9lHLtbRQfjdWA';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-81.24, 43.02], // London, ON coordinates
    zoom: 13
});
map.scrollZoom.disable();
map.touchZoomRotate.disable();
map.addControl(new mapboxgl.NavigationControl());

const Draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        trash: true
    },
    styles: [
        {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_polygon']],
            paint: {
                'fill-color': '#ff8800',
                'fill-opacity': 0.5
            }
        },
        {
            id: 'gl-draw-polygon-fill-inactive',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'draw_polygon']],
            paint: {
                'fill-color': '#ff8800',
                'fill-opacity': 0.5
            }
        },
        {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            },
            paint: {
                'line-color': '#ff6600',
                'line-width': 3
            }
        },
        {
            id: 'gl-draw-polygon-stroke-inactive',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            },
            paint: {
                'line-color': '#ff6600',
                'line-width': 2
            }
        },
        {
            id: 'gl-draw-polygon-midpoint',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            paint: {
                'circle-radius': 5,
                'circle-color': '#ff6600'
            }
        },
        {
            id: 'gl-draw-polygon-and-line-vertex-halo-active',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
            paint: {
                'circle-radius': 8,
                'circle-color': '#fff'
            }
        },
        {
            id: 'gl-draw-polygon-and-line-vertex-active',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
            paint: {
                'circle-radius': 6,
                'circle-color': '#ff6600'
            }
        }
    ]
});
map.addControl(Draw, 'top-left');

// Show instructions for drawing a polygon
const mapLabel = document.createElement('div');
mapLabel.style.margin = '10px 0';
mapLabel.style.fontWeight = 'bold';
mapLabel.style.color = '#6b21a8';
mapLabel.innerHTML = 'Use the polygon tool (top left) to draw a boundary on the map.<br><span style="color:#ff6600;font-weight:normal;">Double-click (or double-tap) to finish drawing.</span>';
document.getElementById('map').parentElement.insertBefore(mapLabel, document.getElementById('map'));

let boundary = null;
map.on('draw.create', (e) => {
    const feature = e.features[0];
    if (feature && feature.geometry && feature.geometry.type === 'Polygon') {
        boundary = feature.geometry.coordinates[0];
    }
});
map.on('draw.update', (e) => {
    const feature = e.features[0];
    if (feature && feature.geometry && feature.geometry.type === 'Polygon') {
        boundary = feature.geometry.coordinates[0];
    }
});
map.on('draw.delete', () => {
    boundary = null;
});

// Form submission
const form = document.getElementById('neighborhoodForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!boundary) {
        alert('Please draw the neighborhood boundaries on the map');
        return;
    }
    if (!selectedAddress) {
        alert('Please select an address from the suggestions.');
        return;
    }
    const neighborhoodName = document.getElementById('neighborhoodName').value;
    const inviteCode = document.getElementById('inviteCode').textContent;
    const user = JSON.parse(localStorage.getItem('user'));
    try {
        const response = await fetch(config.getApiUrl('/api/neighborhood/create'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': user && user._id ? user._id : ''
            },
            credentials: 'include',
            body: JSON.stringify({
                name: neighborhoodName,
                address: selectedAddress,
                boundary,
                inviteCode
            })
        });
        if (response.ok) {
            window.location.href = '/pages/dashboard/index.html';
        } else {
            alert('Failed to create neighborhood. Please try again.');
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
}); 