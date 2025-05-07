## 🔑 Twitter API Setup Guide (OAuth 2.0)

To run this application, you’ll need to obtain Twitter API credentials using **OAuth 2.0**. Follow the steps below to generate your **Client ID** and **Client Secret**.

---

### 🔗 Twitter Developer Portal

➡ **Link:** [https://developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)

---

### ✅ Step-by-Step Instructions

1. **Log in to the Twitter Developer Portal**

   Go to the [Twitter Developer Dashboard](https://developer.twitter.com/en/portal/dashboard) and sign in with your Twitter account.

2. **Create a New Project & App**

   - Navigate to: `Projects & Apps > Overview`
   - Click **"Create App"**
   - Provide an app name and select **OAuth 2.0** as the authentication method

3. **Configure OAuth 2.0 Settings**

   - Go to your app's **Settings** tab
   - Under **OAuth 2.0**, configure:
   - **Callback URL:**  
      `https://your-domain.com/api/login/callback` — _Replace `your-domain.com` with your actual domain. It must match exactly as configured in the Twitter Developer Portal._

     - **Website URL:**  
       `https://your-deployment-url.com`
     - **Client Type:** Confidential
     - **Scopes (Permissions):**
       - `tweet.read`
       - `tweet.write`
       - `users.read`
       - `offline.access` _(required for refresh tokens)_

   - Save the changes.

4. **Generate OAuth 2.0 Credentials**

   - Navigate to the **Keys and Tokens** tab
   - Click **"Generate"** under **OAuth 2.0 Client ID and Client Secret**
   - Copy and store the credentials securely.

---

### 🧪 Add to Environment Variables

- Paste your credentials in the `.env` file like you
- During one-click deployment, you'll be asked to enter these credentials as environment variables.

below:

```env
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
```

## Tweet Character Limits

When using this tool to post tweets via the Twitter (X) API, please note:

- **Free Twitter/X Users** are limited to **280 characters per tweet**.
- If you attempt to tweet more than 280 characters from a free account, the request will **fail**.
- To unlock longer tweet capabilities (up to 4,000 characters), users must upgrade to **Twitter Blue (X Premium)**.

👉 You can upgrade or learn more here: [https://x.com/i/premium_sign_up](https://x.com/i/premium_sign_up)

<!-- {
  "encryptedAccessToken": "GibGtcNKhXH6EMmLa2+2sDF/GXicObqatN5Xxop0pUTt+yQnUX82g2HRAxCV/hYsX8Jd2Gm82nsuW3PElQ3Xrg2AabeGHB9WrSpUNCoNfY/lowKRXgOqpxA46uiPlwZGwgNKy5s6bxWI6sY=",
  "encryptedRefreshToken": "KTXk88FilSzWdt6pXGCphTJGM1CuOoCIieZX741mtXbo0wUlfn8ih1TADwGDyCs1SPxNkG3kyjMsWwTTlQ3Xrg2AabeGHB9WrSpUNCoNfY/lowKRXgCmpxA46iNEb4KBzethwzVxSTNkJ6E="
} 10:06 -->
