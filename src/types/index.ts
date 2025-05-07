/**
 * Twitter API token interface
 */
export interface TwitterTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Encrypted Twitter token interface
 */
export interface EncryptedTokens {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
}

/**
 * Twitter API OAuth response interface
 */
export interface TwitterOAuthResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    scope: string;
    refresh_token?: string;
}

/**
 * Twitter API tweet post response interface
 */
export interface TwitterPostResponse {
    data: {
        id: string;
        text: string;
    };
}

/**
 * Schedule configuration interface
 */
export interface ScheduleConfig {
    config: {
        persona: string;
        maxLength: number;
        timezone: string;
        [key: string]: any;
    };
    schedule: {
        [timeKey: string]: {
            type: string;
            instruction: string;
            [key: string]: any;
        };
    };
}

/**
 * Webhook registration request interface
 */
export interface WebhookRegistrationRequest {
    url: string;
}

/**
 * Tweet webhook request interface
 */
export interface TweetWebhookRequest {
    tweet: string;
}

/**
 * Token loading request interface
 */
export interface TokenLoadRequest {
    accessToken: string;
    refreshToken: string;
    password: string;
}

/**
 * API response interface for standardized responses
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

