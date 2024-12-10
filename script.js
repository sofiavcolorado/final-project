const clientId = '2cb9558f161945b991ab7f6159ebf38e';
const clientSecret = '90601657df9b4bcf9c201f15428b24b7';
const redirectU = 'https://sofiavcolorado.github.io/final-project/index.html'; // Temporary local server URL
const scopes = ['user-top-read'];

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
        redirectU
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
            redirect_uri: redirectU,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange authorization code for access token');
    }

    return await response.json();
}

// Refresh the access token using the refresh token
async function refreshAccessToken(refreshToken) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error_description);
    }
    return data.access_token; // Return the new access token
}

// Fetch the user's top genre
async function fetchTopGenre(accessToken) {
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
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
            imageElement.src = "images/brainrot_central.png";
            imageElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Error Displaying Genre Image:', error);
        document.getElementById('message').textContent = 'An error occurred while fetching the genre image.';
    }
}

// Main function
(async function main() {
    // Check if the user has already authorized the app, otherwise redirect to Spotify login
    if (localStorage.getItem('test') == null) {
        redirectToSpotifyLogin();
        localStorage.setItem('test', 'true');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (!authCode) {
        console.error('Authorization code is missing');
        return;
    }

    console.log('Authorization Code:', authCode);

    try {
        // If there is an access token in localStorage, use it
        let accessToken = localStorage.getItem('access_token');
        let refreshToken = localStorage.getItem('refresh_token');

        if (!accessToken) {
            const { access_token, refresh_token } = await getAccessToken(authCode);
            console.log('Access Token:', access_token);
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            accessToken = access_token; // Store for future use
        }

        const topGenre = await fetchTopGenre(accessToken);
        console.log('Top Genre:', topGenre);

        await displayGenreImage(topGenre);
    } catch (error) {
        console.error('Error:', error);

        // Check if token expired, and try to refresh it
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (accessToken && refreshToken) {
            try {
                const newAccessToken = await refreshAccessToken(refreshToken);
                localStorage.setItem('access_token', newAccessToken);
                console.log('Access Token refreshed:', newAccessToken);
                
                const topGenre = await fetchTopGenre(newAccessToken);
                await displayGenreImage(topGenre);
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
            }
        } else {
            document.getElementById('message').textContent = 'An error occurred. Please check the console for details.';
        }
    }
})();
