# 🔑 Twitter Token Generation Guide

This guide provides a complete solution for generating Twitter OAuth 2.0 access and refresh tokens using Express.js.

## 📋 Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Twitter Developer Account with OAuth 2.0 credentials

## 🛠️ Installation

```bash
# Create a new directory
mkdir twitter-token-generator
cd twitter-token-generator

# Initialize a new Node.js project
npm init -y

# Install required dependencies
npm install express axios crypto querystring express-session
npm install --save-dev typescript ts-node @types/express @types/express-session

# Create TypeScript configuration
npx tsc --init
```

## 📝 Code Implementation

### 🔧 Imports and Type Definitions

```typescript
// Required imports
import express from "express";
import axios from "axios";
import crypto from "crypto";
import querystring from "querystring";
import session from "express-session";
import { Buffer } from "buffer";

// Type definitions
type Request = express.Request;
type Response = express.Response;

declare module "express-session" {
  interface Session {
    codeVerifier: string;
  }
}

interface TwitterTokens {
  access_token: string;
  refresh_token: string;
}
```

### ⚙️ Configuration

```typescript
// Configuration
const config = {
  clientId: "your_twitter_client_id", //twitter client id
  clientSecret: "your_twitter_client_secret", // twitter secret
  redirectUri: "http://localhost:3000/callback", //change port or domain according to your configurations
  port: 3000,
  sessionSecret: "your_session_secret", //set a value and keep it secure
};

// Initialize Express app
const app = express();

// Session middleware
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
  })
);
```

### 🔐 PKCE Generation

```typescript
// Generate PKCE code verifier and challenge
const generatePKCE = (): { codeVerifier: string; codeChallenge: string } => {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
};
```

### 🔗 OAuth Endpoints

#### Login Route

```typescript
// Login route - initiates OAuth flow
app.get("/login", (req: Request, res: Response): void => {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  // Store code verifier in session
  req.session.codeVerifier = codeVerifier;

  const authorizationUrl = `https://twitter.com/i/oauth2/authorize?${querystring.stringify(
    {
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: "tweet.read users.read tweet.write offline.access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }
  )}`;

  res.redirect(authorizationUrl);
});
```

#### Callback Route

```typescript
// Callback route - handles OAuth response
app.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  const codeVerifier = req.session.codeVerifier;

  if (!code || !codeVerifier) {
    res.status(400).send("Authorization failed: Missing code or verifier");
    return;
  }

  const basicAuth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  try {
    const response = await axios.post<TwitterTokens>(
      "https://api.twitter.com/2/oauth2/token",
      querystring.stringify({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
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

    res.send(
      `Access and refresh tokens received: ${JSON.stringify(
        { access_token, refresh_token },
        null,
        2
      )}`
    );
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      res
        .status(500)
        .send(
          `Error during the token exchange: ${JSON.stringify(
            error.response?.data || error.message
          )}`
        );
    } else {
      res.status(500).send("An unexpected error occurred");
    }
  }
});
```

### 🚀 Server Startup

```typescript
// Start the server
app.listen(config.port, () => {
  console.log(
    `Access and Refresh Token Generator listening on port ${config.port}`
  );
});
```

## 📋 Complete File

Save all the code above to a file named `twitter-token-generator.ts`.

## 🚀 Running the Application

```bash
# Run the application
npx ts-node twitter-token-generator.ts
```

## 🔄 Usage Flow

1. Visit `http://localhost:3000/login` in your browser
2. You'll be redirected to Twitter's authorization page
3. Log in and authorize the application
4. You'll be redirected back to your application
5. The access and refresh tokens will be displayed on the page

## 🔐 Security Considerations

- Store your client ID and client secret securely
- Use HTTPS in production
- Implement proper session management
- Consider using a more robust storage solution for the code verifier in production

## 🔗 Integration with AgenticOS

After obtaining your tokens, you can add them to your AgenticOS application using the following endpoint:

```bash
POST <your_project_url>/api/tokens

Body: {
  "accessToken": "your_access_token",
  "refreshToken": "your_refresh_token"
}
```
