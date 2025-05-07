import { Context } from "hono";
import axios from "axios";
import crypto from "crypto";
import querystring from "querystring";
import { Buffer } from "buffer";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "../config/env";
import { saveTokens, tokenAlreadyExists } from "../utils/encryption";

interface TwitterTokens {
  access_token: string;
  refresh_token: string;
}
// Get the domain dynamically
const getDomain = (c: Context): string => {
  const host = c.req.header("host");
  const isLocalhost = host?.includes("localhost") || host?.includes("127.0.0.1");
  const protocol = isLocalhost ? "http" : c.req.header("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
};

// Configuration – replace with your Twitter app credentials
const config = {
  clientId: process.env.TWITTER_CLIENT_ID, // Twitter OAuth2 Client ID
  clientSecret: process.env.TWITTER_CLIENT_SECRET, // Twitter OAuth2 Client Secret
  redirectUri: (c: Context) => `${getDomain(c)}/api/login/callback`, // Must match callback in Twitter app settings
  port: process.env.PORT || 8000,
};

// Generate PKCE code verifier and challenge
const generatePKCE = (): { codeVerifier: string; codeChallenge: string } => {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
};

// Login route – initiates the OAuth flow
export const login = async (c: Context) => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  // Store the code verifier in a cookie
  setCookie(c, "codeVerifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 5 * 60 * 1000, // 5 minutes
  });

  // Redirect to Twitter's OAuth 2.0 authorization endpoint
  const authorizationUrl = `https://twitter.com/i/oauth2/authorize?${querystring.stringify({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri(c), //config.redirectUri,// config.redirectUri(c),
    scope: "tweet.read users.read tweet.write offline.access",
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })}`;

  return c.redirect(authorizationUrl);
};

// Callback route – handles Twitter's redirect back to our app
export const callback = async (c: Context) => {
  const code = c.req.query("code");
  const codeVerifier = getCookie(c, "codeVerifier");
  if (!code || !codeVerifier) {
    return c.json({ error: "Authorization failed: Missing code or verifier" }, 400);
  }
  // Prepare Basic auth header for Twitter token request
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  try {
    // Exchange the authorization code for access and refresh tokens
    const response = await axios.post<TwitterTokens>(
      "https://api.twitter.com/2/oauth2/token",
      querystring.stringify({
        code: code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri(c), //config.redirectUri,//config.redirectUri(c),
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    // Return HTML form
    return c.html(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Twitter Auth - Token Management</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        :root {
          --primary: #1DA1F2;
          --dark: #14171A;
          --light: #FFFFFF;
          --gray: #657786;
          --light-gray: #E1E8ED;
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: #f5f8fa;
          color: var(--dark);
        }
        
        header {
          background: var(--primary);
          color: var(--light);
          padding: 1rem;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .container {
          max-width: 600px;
          margin: 2rem auto;
          padding: 0 1rem;
        }

        .card {
          background: var(--light);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .token-display {
          margin: 1rem 0;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          position: relative;
        }

        .token-row {
          margin-bottom: 1.5rem;
        }

        .token-label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--gray);
        }

        .token-value {
          word-break: break-all;
          padding: 0.5rem;
          background: var(--light-gray);
          border-radius: 4px;
          font-family: monospace;
          position: relative;
        }

        .password-section {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--light-gray);
        }

        input[type="password"] {
          width: 100%;
          padding: 0.75rem;
          margin: 0.5rem 0;
          border: 2px solid var(--light-gray);
          border-radius: 4px;
          font-size: 1rem;
        }

        button[type="submit"] {
          background: var(--primary);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 4px;
          width: 100%;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        button[type="submit"]:hover {
          background: #1991DA;
        }

        footer {
          text-align: center;
          padding: 1rem;
          color: var(--gray);
          margin-top: 2rem;
        }

        .success-message {
          display: none;
          background: #4CAF50;
          color: white;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Twitter Token Management</h1>
        <p>Securely save your OAuth tokens</p>
      </header>

      <div class="container">
        <div class="card">
          <div class="token-row">
            <span class="token-label">Access Token:</span>
            <div class="token-display">
              <div class="token-value" id="accessTokenValue">${access_token}</div>
            </div>
          </div>

          <div class="token-row">
            <span class="token-label">Refresh Token:</span>
            <div class="token-display">
              <div class="token-value" id="refreshTokenValue">${refresh_token}</div>
            </div>
          </div>

          <div class="password-section">
            <form id="tokenForm" onsubmit="submitForm(event)">
              <input type="hidden" id="accessToken" value="${access_token}" />
              <input type="hidden" id="refreshToken" value="${refresh_token}" />
              <label class="token-label">Enter Password to Save Tokens:</label>
              <input type="password" id="password" required placeholder="Enter your secure password" />
              <div class="success-message" id="successMessage">Tokens saved successfully!</div>
              <button type="submit">Save Tokens</button>
            </form>
          </div>
        </div>
      </div>

      <footer>
        <p>Powered by AgenticOS - Secure Token Management</p>
      </footer>

      <script>
        async function submitForm(e) {
          e.preventDefault();
          const submitBtn = e.target.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.innerText = 'Saving...';

          try {
            const response = await fetch('/api/tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                accessToken: document.getElementById('accessToken').value,
                refreshToken: document.getElementById('refreshToken').value,
                password: document.getElementById('password').value
              })
            });
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('successMessage').style.display = 'block';
              setTimeout(() => window.location.href = '/', 2000);
            } else {
              alert(data.message || 'Error saving tokens');
            }
          } catch (error) {
            alert('Error saving tokens');
          } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Save Tokens';
          }
        }
      </script>
    </body>
  </html>
`);
    // Directly call loadTokens with the context
    //  const isAlreadyExist = await tokenAlreadyExists();

    // if (!isAlreadyExist) {
    //   await saveTokens(access_token, refresh_token, env.ENCRYPTION_KEY);
    //   return c.json({
    //     success: true,
    //     message: "OAuth access token and refresh token have been saved successfully",
    //     access_token,
    //     refresh_token,
    //     status: "new_tokens_saved"
    //   });
    // } else {
    //   return c.json({
    //     success: true,
    //     message: "Tokens already exist. To update, use the token update API endpoint",
    //     access_token,
    //     refresh_token,
    //     status: "tokens_exist",
    //     update_endpoint: "/api/tokens/update"
    //   });
    // }
    // return c.json({ access_token, refresh_token });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      return c.json(
        { error: `Error during the token exchange: ${JSON.stringify(error.response?.data || error.message)}` },
        500
      );
    } else {
      return c.json({ error: "An unexpected error occurred" }, 500);
    }
  }
};
// Callback route – handles Twitter's redirect back to our app
export const callback1 = async (c: Context) => {
  const code = c.req.query("code");
  const codeVerifier = getCookie(c, "codeVerifier");
  if (!code || !codeVerifier) {
    return c.json({ error: "Authorization failed: Missing code or verifier" }, 400);
  }
  // Prepare Basic auth header for Twitter token request
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  try {
    // Exchange the authorization code for access and refresh tokens
    const response = await axios.post<TwitterTokens>(
      "https://api.twitter.com/2/oauth2/token",
      querystring.stringify({
        code: code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri(c), //config.redirectUri,//config.redirectUri(c),
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const { access_token, refresh_token } = response.data;
    // Directly call loadTokens with the context
    const isAlreadyExist = await tokenAlreadyExists();

    if (!isAlreadyExist) {
      await saveTokens(access_token, refresh_token, env.ENCRYPTION_KEY);
      return c.json({
        success: true,
        message: "OAuth access token and refresh token have been saved successfully",
        access_token,
        refresh_token,
        status: "new_tokens_saved",
      });
    } else {
      return c.json({
        success: true,
        message: "Tokens already exist. To update, use the token update API endpoint",
        access_token,
        refresh_token,
        status: "tokens_exist",
        update_endpoint: "/api/tokens/update",
      });
    }
    // return c.json({ access_token, refresh_token });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      return c.json(
        { error: `Error during the token exchange: ${JSON.stringify(error.response?.data || error.message)}` },
        500
      );
    } else {
      return c.json({ error: "An unexpected error occurred" }, 500);
    }
  }
};


