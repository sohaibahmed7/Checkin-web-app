# Check-In Dashboard

A modern, responsive dashboard for the Check-In community safety app. Built with vanilla JavaScript and Mapbox integration.

## Features

- Real-time community alerts and notifications
- Interactive neighborhood map with incident tracking
- Community chat and commenting system
- Detailed incident reporting
- User settings and preferences
- Mobile-responsive design

## Setup

1. Clone the repository now:
```bash
git clone https://github.com/yourusername/check-in-dashboard.git
cd check-in-dashboard
```

2. Open `index.html` in your browser or use a local server:
```bash
# Running site on local
python -m http.server 8000
*in another terminal*
cd .\\backend\\
node server.js

# Using Node.js to view backend
npx serve
```

3. Replace the Mapbox token in `dashboard/scripts/dashboard.js` with your own token:
```javascript
mapboxgl.accessToken = 'your-mapbox-token';
```

## Structure

```
├── backend/
├── index.html
├── styles.css
├── pages/
│   ├── auth/
│   ├── info/
│   ├── neighborhood/
│   ├── moderator/
│   ├── dashboard/
│   └── assets/
├── script.js
├── README.md
```

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Mapbox GL JS
- Font Awesome
- Google Fonts (Poppins)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
