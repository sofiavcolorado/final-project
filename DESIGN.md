For my website, I wanted to be able to reutrn an image based on the users top genre in addition to actually returning what their top genre was, given by Spotify. In order to do this, I created two placeholders where based on the information given by Spotify, it would return an image and a strign (based on the Javascript file). 
The Javascript file was the most technical aspect of the website. While Spotify provides a lot of code in order to correctly use their API, getting the neccesarry tokens, ids and all other needed random words and numbers was the harder part. Spotify had a lot of measures for securing information, which meant that there were a lot of differnt things needed before a user can log in. First, it securley connects to Spotify by having the user log in, then fetches the users top artists and then figures out which genre they listen to the most based on their artists. If the genre returned from Spotify matches and of the genres stored in genres.json it returns the corresponding image. If there is no genre that matches in the json file, then it returns a default picture. Additionally, if anything goes wrong in any of the steps between Spotify's API and my code, then an error message will appear. 
In order to not just have a long array of the images and genres, I created a json file that acted as a dictinary and was linked to the Javascript file. This allowed for easier use of the images and their corresponding genre. 
For the design aspect of the website, I used google fonts in order to not just have normal text, Bootstrap grid basic and buttons, as well as differnet colors to make the website more appealing. I choose the google fonts based on which ones looked more tech (the h1 is a bunch of pixels combined and the "p" one is the typical typewriter one). The Bootstrap gird basic was used in the index.html file by using the "container" div in order to have everything more organized and in the moodboard.html file, Bootstrap rows and containers were used so that the pictures wouldnt overlap no matter what the users screen size was. Both pages have buttons on the bottom so that the user has a way of going back and forth between the two pages, which involved using Bootsrap buttons for the aesthetic and links to each page. 

const clientId = '2cb9558f161945b991ab7f6159ebf38e';
const clientSecret = '90601657df9b4bcf9c201f15428b24b7';
const redirectU = 'https://sofiavcolorado.github.io/final-project/index.html'; // Temporary local server URL
const scopes = ['user-top-read'];
const token = 'BQD8vV5CWQ89YhILGTDPJoZudjnKDy0BNI7KrcMfZ2sWhS9oEMjX3cRYCmV5ygc7oiJIVX4ooNQQoRVv5Hvjh_oG-_5rWLCLRYhwyl32kjJ2BieekT8'; //access token is only valid for an hour

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