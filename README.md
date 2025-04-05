# Volunteer Map Platform

A full-stack web application for discovering and sharing volunteer opportunities via an interactive map. Built with Node.js, Express, MongoDB, and Tailwind CSS.

## Features

- 🗺️ **Interactive Map**: Discover volunteer opportunities near you using Google Maps
- 🔐 **Authentication**: User accounts with Auth0, including role-based access (volunteer vs organization)
- 📥 **Opportunity Management**: Organizations can create, edit and manage volunteer opportunities
- ✅ **Event Registration**: Volunteers can attend events and earn points
- 🧾 **Leaderboard**: Track top volunteers by week, month, or year
- 📱 **Responsive Design**: Works on all devices (mobile, tablet, desktop)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Auth0 account
- Google Maps API key

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/volunteer-map.git
   cd volunteer-map
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `/config` directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   AUTH0_DOMAIN=your_auth0_domain
   AUTH0_CLIENT_ID=your_auth0_client_id
   AUTH0_CLIENT_SECRET=your_auth0_client_secret
   AUTH0_CALLBACK_URL=http://localhost:3000/callback
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. Set up MongoDB Atlas:
   - Create a cluster in MongoDB Atlas
   - Create a database user
   - Get your connection string and add it to the `.env` file

5. Set up Auth0:
   - Create a new application in Auth0 Dashboard
   - Configure your application settings
   - Add callback URLs
   - Get your Auth0 credentials and add them to the `.env` file

6. Set up Google Maps:
   - Create a project in Google Cloud Console
   - Enable Maps JavaScript API and Places API
   - Create an API key and add it to the `.env` file

## Running the Application

Start the development server:
```
npm run dev
```

Or for production:
```
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
volunteer-map/
├── config/               # Configuration files
├── controllers/          # Route controllers
├── middleware/           # Express middleware
├── models/               # Mongoose models
├── public/               # Static files
│   ├── css/              # CSS files
│   ├── js/               # Client-side JavaScript
│   └── images/           # Image assets
├── routes/               # Express routes
├── views/                # Handlebars templates
│   ├── layouts/          # Page layouts
│   └── partials/         # Reusable components
├── app.js                # Application entry point
└── package.json          # Project dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License. 