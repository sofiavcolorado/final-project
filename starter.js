const CLIENT_ID = '2cb9558f161945b991ab7f6159ebf38e';
const CLIENT_SECRET = '90601657df9b4bcf9c201f15428b24b7';
const REDIRECT_URI = 'http://127.0.0.1:5500/callback'; // Must match your Spotify app settings
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const loginButton = document.getElementById('loginButton');

// Step 1: Redirect User to Spotify Login
loginButton.addEventListener('click', () => {
  const scope = encodeURIComponent('user-read-private user-read-email'); // Add your scopes
  const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${scope}`;
  window.location.href = authUrl;
});

// Step 2: Extract Code from URL
function getCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

const code = getCodeFromUrl();

if (code) {
  // Step 3: Exchange Code for Access Token
  fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, // Encode client_id:client_secret
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Display the access token
      console.log(`Access Token: ${data.access_token}`);
    })
    .catch((error) => console.error('Error fetching access token:', error));
}