const clientId = '2cb9558f161945b991ab7f6159ebf38e';
const clientSecret = '90601657df9b4bcf9c201f15428b24b7';
const redirectUri = 'http://127.0.0.1:5500/'; // Temporary local server URL
const scopes = ['user-top-read'];
const token = 'BQD8vV5CWQ89YhILGTDPJoZudjnKDy0BNI7KrcMfZ2sWhS9oEMjX3cRYCmV5ygc7oiJIVX4ooNQQoRVv5Hvjh_oG-_5rWLCLRYhwyl32kjJ2BieekT8';

// Generate a random string for the code verifier
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map(x => characters[x % characters.length])
        .join('');
}

// Generate a code challenge from the code verifier
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

// Redirect to Spotify login
async function redirectToSpotifyLogin() {
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('code_verifier', codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=${encodeURIComponent(scopes.join(' '))}&code_challenge_method=S256&code_challenge=${codeChallenge}`;

    window.location.href = authUrl;
}

// Get the access token from Spotify
async function getAccessToken(authCode) {
    const codeVerifier = sessionStorage.getItem('code_verifier');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange authorization code for access token');
    }

    return await response.json();
}

// Fetch the user's top genre
async function fetchTopGenre(accessToken) {
    console.log(accessToken)
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}`, },
    });

    if (!response.ok) throw new Error('Failed to fetch top artists');

    const data = await response.json();
    const genres = data.items.flatMap(artist => artist.genres);
    const genreCounts = genres.reduce((counts, genre) => {
        counts[genre] = (counts[genre] || 0) + 1;
        return counts;
    }, {});

    return Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([genre]) => genre)[0]; // Return the top genre
}

// Display the genre image based on the top genre
async function displayGenreImage(topGenre) {
    try {
        const response = await fetch('genres.json');
        if (!response.ok) throw new Error('Failed to fetch genre mappings');

        const genreMappings = await response.json();
        console.log('Genre Mappings:', genreMappings);

        const genreImage = genreMappings["genres"][topGenre];
        if (genreImage) {
            document.getElementById('message').textContent = `Your top genre is: ${topGenre}`;
            const imageElement = document.getElementById('genre-image');
            imageElement.src = genreImage;
            imageElement.style.display = 'block';
        } else {
            document.getElementById('message').textContent = `Your top genre is: ${topGenre}`;
            const imageElement = document.getElementById('genre-image');
            imageElement.src = "images/2000emo.png";
            imageElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Error Displaying Genre Image:', error);
        document.getElementById('message').textContent = 'An error occurred while fetching the genre image.';
    }
}

// Main function
(async function main() {

    if (localStorage.getItem('test') == null) {
        redirectToSpotifyLogin();
        localStorage.setItem('test', 'true');
    }
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    console.log('Authorization Code:', authCode);

    try {
        const { access_token } = await getAccessToken(authCode);
        console.log('Access Token:', access_token);
        localStorage.removeItem('test');

        const topGenre = await fetchTopGenre(access_token);
        console.log('Top Genre:', topGenre);

        await displayGenreImage(topGenre);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('message').textContent = 'An error occurred. Please check the console for details.';
    }
})();