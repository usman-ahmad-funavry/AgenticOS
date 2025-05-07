import axios from "axios";
import { env } from "../config/env";
import { loadTokens, saveTokens } from "../utils/encryption";
import { TwitterOAuthResponse, TwitterPostResponse } from "../types";

// ChainGPT API URL
const CHAINGPT_API_URL = "https://webapi.chaingpt.org";

/**
 * Get Twitter access token by using an existing refresh token
 * @returns Promise containing the refreshed access token
 */
export const getAccessToken = async (): Promise<string> => {
  try {
    const tokens = await loadTokens(env.ENCRYPTION_KEY);

    // Check if we need to refresh the token
    try {
      // Attempt to use the current token to see if it's still valid
      await axios.get("https://api.twitter.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      // If no error is thrown, token is still valid
      return tokens.accessToken;
    } catch (error) {
      // Token expired, refresh it
      const newTokens = await refreshAccessToken(tokens.refreshToken);

      // Save new tokens
      await saveTokens(
        newTokens.accessToken,
        newTokens.refreshToken,
        env.ENCRYPTION_KEY
      );

      return newTokens.accessToken;
    }
  } catch (error) {
    console.error("Error getting Twitter access token:", error);
    throw new Error(
      "Failed to get Twitter access token. Check if tokens are set up correctly."
    );
  }
};

/**
 * Refresh Twitter access token using a refresh token
 * @param refreshToken - The Twitter API refresh token
 * @returns Promise with updated access and refresh tokens
 */
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> => {
  try {
    const params = new URLSearchParams();
    params.append("refresh_token", refreshToken);
    params.append("grant_type", "refresh_token");
    params.append("client_id", env.TWITTER_CLIENT_ID);

    const response = await axios.post<TwitterOAuthResponse>(
      "https://api.twitter.com/2/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: env.TWITTER_CLIENT_ID,
          password: env.TWITTER_CLIENT_SECRET,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new Error("Failed to refresh Twitter access token");
  }
};

/**
 * Generate text for a tweet using ChainGPT
 * @param prompt - The prompt to generate tweet content
 * @returns Promise with the generated tweet text
 */
export const getTextForTweet = async (prompt: string): Promise<string> => {
  try {
    const response = await axios.post(
      `${CHAINGPT_API_URL}/tweet-generator`,
      {
        prompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": env.CHAINGPT_API_KEY,
        },
      }
    );
    // let tweetText = response.data.tweet;
    let tweetText = response.data.tweet.slice(0, 270); // use this for base twitter api key
    return tweetText;
  } catch (error) {
    console.error("Error generating tweet text:", error);
    throw new Error("Failed to generate tweet content using ChainGPT API");
  }
};

/**
 * Post a tweet to Twitter
 * @param accessToken - The Twitter API access token
 * @param message - The message to tweet
 * @returns Promise with the Twitter API response
 */
export const postTweet = async (
  accessToken: string,
  message: string
): Promise<TwitterPostResponse> => {
  try {
    const response = await axios.post<TwitterPostResponse>(
      "https://api.twitter.com/2/tweets",
      {
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error posting tweet:", error);
    throw error;
  }
};

/**
 * Generate a tweet based on prompt and post it to Twitter
 * @param prompt - The prompt to generate tweet content
 * @returns Promise with the Twitter API response and posted tweet
 */
export const generateAndPostTweet = async (
  prompt: string
): Promise<{
  response: TwitterPostResponse;
  tweet: string;
}> => {
  try {
    const tweet = await getTextForTweet(prompt);
    const accessToken = await getAccessToken();
    const response = await postTweet(accessToken, tweet);

    console.log(`Tweet posted successfully: ${tweet}`);

    return {
      response,
      tweet,
    };
  } catch (error) {
    console.error("Error generating and posting tweet:", error);
    throw error;
  }
};

/**
 * Upload and post a tweet directly with given message
 * @param message - The message to tweet
 * @returns Promise with the Twitter API response
 */
export const uploadTwitterPostTweet = async (
  message: string
): Promise<TwitterPostResponse> => {
  try {
    const accessToken = await getAccessToken();
    const response = await postTweet(accessToken, message);

    console.log(`Tweet posted successfully: ${message}`);

    return response;
  } catch (error) {
    console.error("Error posting tweet:", error);
    throw error;
  }
};
