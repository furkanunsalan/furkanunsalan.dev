![screenshot](public/photos/preview/image.png)

# Personal Website
Welcome to my personal website repository. This project includes various components and functionalities for my personal site, including an integration with the Spotify API to display the currently playing track.
## Getting Started
### Prerequisites
- Node.js (version 16.x or later)
- npm or yarn
### Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/your-repository.git
   cd your-repository
   ```
2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```
### Environment Variables
Create a `.env.local` file in the root of your project and add the following environment variables:
```dotenv
UNSPLASH_ACCESS_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
SPOTIFY_REFRESH_TOKEN=
```
Replace the placeholders with your actual credentials.
- `UNSPLASH_ACCESS_KEY`: Your Unsplash API access key.
- `SPOTIFY_CLIENT_ID`: Your Spotify Client ID.
- `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret.
- `SPOTIFY_REDIRECT_URI`: Your Spotify Redirect URI.
- `SPOTIFY_REFRESH_TOKEN`: Your Spotify Refresh Token.
### Development
To start the development server:
```bash
npm run dev
# or
yarn dev
```
Navigate to `http://localhost:3000` to see the website in your browser.
### Deployment
Deploy the project to Vercel for production by running:
```bash
vercel
```
Follow the prompts to complete the deployment.
## Components
### NowPlaying Component
The `NowPlaying` component fetches and displays the currently playing track from Spotify. It uses the Spotify API to get the current track information and animates visual bars when a track is playing.
File Location: `app/api/now-playing/route.ts`
Usage:
```jsx
import NowPlaying from './components/NowPlaying';

function App() {
  return (
    <div>
      <NowPlaying />
    </div>
  );
}

export default App;
```
## Spotify API Integration
For more detailed information on how to integrate with the Spotify API, check out this guide:
[Spotify API with Next.js](https://leerob.io/blog/spotify-api-nextjs)
## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
## Contact
If you have any questions, feel free to reach out to me at `me@furkanunsalan.dev`.
