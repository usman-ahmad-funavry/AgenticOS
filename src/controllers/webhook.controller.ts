import { Context } from "hono";
import axios from "axios";
import ejs from "ejs";
import { env } from "../config/env";
import { uploadTwitterPostTweet } from "../services/twitter.service";
import { ApiResponse, TweetWebhookRequest, WebhookRegistrationRequest } from "../types";
import { join } from "path";

// ChainGPT API URL
const CHAINGPT_API_URL = "https://webapi.chaingpt.org";

/**
 * Fetch connected webhook from ChainGPT
 * @returns Connected webhook URL or null
 */
async function fetchConnectedWebhook(): Promise<string | null> {
  try {
    const response = await axios.get(`${CHAINGPT_API_URL}/webhook-subscription/`, {
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "api-key": env.CHAINGPT_API_KEY,
      },
    });

    return response?.data?.webhookUrl || null;
  } catch (error) {
    console.error("Error fetching connected webhook:", error);
    return null;
  }
}

/**
 * Fetch all categories and subscribed categories from ChainGPT
 * @returns Object containing all categories with subscription status
 */
async function fetchCategories(): Promise<any[]> {
  try {
    const response = await axios.get(`${CHAINGPT_API_URL}/category-subscription`, {
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "api-key": env.CHAINGPT_API_KEY,
      },
    });

    const allCategories = response?.data?.allCategories || [];
    const subscribedCategories = response?.data?.subscribedCategories || [];

    // Add isSubscribed property to allCategories
    return allCategories.map((category: any) => ({
      ...category,
      isSubscribed: subscribedCategories.some(
        (subscribedCategory: any) => subscribedCategory?.categoryId === category?.id
      ),
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

/**
 * Register a webhook with ChainGPT
 * @param c - Hono context
 * @returns Response with registration result
 */
export const registerWebhook = async (c: Context): Promise<Response> => {
  try {
    const { url } = await c.req.json<WebhookRegistrationRequest>();

    if (!url) {
      return c.json<ApiResponse>(
        {
          success: false,
          message: "URL is required",
          error: "Missing required field: url",
        },
        400
      );
    }

    const response = await axios.post(
      `${CHAINGPT_API_URL}/webhook-subscription/register`,
      { url },
      {
        headers: {
          "api-key": env.CHAINGPT_API_KEY,
        },
      }
    );

    return c.json<ApiResponse>({
      success: true,
      message: "Webhook registered successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error registering webhook:", error);

    return c.json<ApiResponse>(
      {
        success: false,
        message: "Failed to register webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};

/**
 * Handle incoming webhook requests for posting tweets
 * @param c - Hono context
 * @returns Response with tweet result
 */
export const tweetWebhook = async (c: Context): Promise<Response> => {
  try {
    const { tweet } = await c.req.json<TweetWebhookRequest>();

    if (!tweet) {
      return c.json<ApiResponse>(
        {
          success: false,
          message: "Tweet content is required",
          error: "Missing required field: tweet",
        },
        400
      );
    }

    let tweetText = tweet;
    //  let tweetText = tweet.slice(0, 270);

    const response = await uploadTwitterPostTweet(tweetText);

    return c.json<ApiResponse>({
      success: true,
      message: "Tweet posted successfully",
      data: { tweetText, response },
    });
  } catch (error) {
    console.error("Error posting tweet via webhook:", error);

    return c.json<ApiResponse>(
      {
        success: false,
        message: "Failed to post tweet",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};

/**
 * Get the current schedule configuration
 */
export const renderLiveNews = async (c: Context): Promise<Response> => {
  try {
    // Fetch categories and webhook in parallel
    const [categories, currentWebhookUrl] = await Promise.all([fetchCategories(), fetchConnectedWebhook()]);

    // First render the scheduler content
    const liveNewsContent = await ejs.renderFile(join(import.meta.dir, "../../views/live-news.ejs"), {
      title: "Live News",
      data: categories,
      currentWebhookUrl,
    });

    // Then inject it into the layout
    const html = await ejs.renderFile(join(import.meta.dir, "../../views/layout.ejs"), {
      title: "Live News",
      body: liveNewsContent,
      path: c.req.path,
    });

    return c.html(html);
  } catch (error) {
    console.error("Error rendering live news:", error);
    throw new Error("Failed to render live news");
  }
};

/**
 * Subscribe to selected categories
 * @param c - Hono context
 * @returns Response with subscription result
 */
export const subscribeToCategories = async (c: Context): Promise<Response> => {
  try {
    const { categoryIds } = await c.req.json();

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return c.json<ApiResponse>(
        {
          success: false,
          message: "Category IDs are required and must be an array",
          error: "Invalid or missing categoryIds",
        },
        400
      );
    }

    const response = await axios.post(
      `${CHAINGPT_API_URL}/category-subscription/subscribe`,
      { categoryIds },
      {
        headers: {
          "api-key": env.CHAINGPT_API_KEY,
        },
      }
    );

    return c.json<ApiResponse>({
      success: true,
      message: "Categories subscribed successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error subscribing to categories:", error);

    return c.json<ApiResponse>(
      {
        success: false,
        message: "Failed to subscribe to categories",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};
