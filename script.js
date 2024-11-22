const clientId = '2cb9558f161945b991ab7f6159ebf38e';
const redirectUri = 'http://127.0.0.1:5500/'; // temporary link to live server
const scopes = ['user-top-read'];

// some code copied from Spotify for Developers but modified to work 
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map(x => characters[x % characters.length])
        .join('');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function redirectToSpotifyLogin() {
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('code_verifier', codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=${encodeURIComponent(scopes.join(' '))}&code_challenge_method=S256&code_challenge=${codeChallenge}`;

    window.location.href = authUrl;
}

async function getAccessToken(authCode) {
    const codeVerifier = sessionStorage.getItem('code_verifier');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
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

async function fetchTopGenres(accessToken) {
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
        .map(([genre]) => genre);
}

(async function main() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (!authCode) {
        redirectToSpotifyLogin();
    } else {
        const { access_token } = await getAccessToken(authCode);
        const topGenres = await fetchTopGenres(access_token);
        console.log('Top Genres:', topGenres);
    }
})();
