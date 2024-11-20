const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}
app.get('/', (req, res) => {
    res.send('Welcome to twitter test');
});

app.get('/auth/twitter', (req, res) => {
    const { codeVerifier, codeChallenge } = generateCodeChallenge();
  
    req.session.codeVerifier = codeVerifier;
    console.log('Generated codeVerifier:', codeVerifier);
    console.log('Generated codeChallenge:', codeChallenge);
  
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(
        process.env.CALLBACK_URL
    )}&scope=tweet.read tweet.write offline.access&state=state&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
  
    res.redirect(authUrl);
  });
  
  
  app.get('/auth/twitter/callback', async (req, res) => {
    try {
      const { code } = req.query;
      const { codeVerifier } = req.session;
  
      console.log('Received authorization code:', code);
      console.log('Retrieved codeVerifier from session:', codeVerifier);
  
      if (!code || !codeVerifier) {
        throw new Error('Missing authorization code or codeVerifier');
      }

      console.log('Sending token request with these parameters:');
        console.log({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: process.env.CALLBACK_URL,
        grant_type: 'authorization_code',
        code_verifier: req.session.codeVerifier,
        });

  
      const tokenResponse = await axios.post('https://api.twitter.com/oauth2/token', new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: process.env.CALLBACK_URL,
        grant_type: 'authorization_code',
        code_verifier: req.session.codeVerifier,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
  
      console.log('Token response:', tokenResponse.data);
      console.log('Token exchange response:', tokenResponse);
      req.session.access_token = tokenResponse.data.access_token;
      res.send('Authentication successful!');
    } catch (error) {
      console.error('Error during callback:', error.response?.data || error.message);
      res.status(500).send('Error during authentication.');
    }
  });
  
  
  

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
