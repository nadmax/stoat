import type { Message } from "revolt.js";

/**
 * Safely reply to a message without crashing on network/API errors
 */
export async function safeReply(message: Message, content: string) {
    try {
        return await message.reply(content);
    } catch (err) {
        console.error("Reply failed:", err);
        return null;
    }
}

/**
 * Safely perform any API action with retries
 */
export async function safeApi<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 500
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;

            const isTimeout =
                err?.cause?.code === "ETIMEDOUT" ||
                err?.message?.includes("fetch failed");

            if (!isTimeout || attempt === retries) break;

            const delay = baseDelay * attempt;
            console.warn(`API timeout (attempt ${attempt}), retrying in ${delay}ms`);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    throw lastError;
}

/**
 * Sleep helper for sequential operations
 */
export function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}
