import { Message } from "revolt.js";
import { safeReply, safeApi, sleep } from "../utils/api.js";

import { config } from "../config.js";
import { hasPermission } from "../utils/permissions.js";
import { logAction } from "../utils/logger.js";

export async function handlePurge(message: Message, args: string[], member: any) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }
    if (!await hasPermission(member, "ManageMessages")) {
        return await safeReply(message, config.messages.noPermission);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > config.purge.maxMessages) {
        return await safeReply(message, `❌ Please provide a number between 1 and ${config.purge.maxMessages}.`);
    }

    try {
        const fetched = await message.channel?.fetchMessagesWithUsers({ limit: amount + 1 });
        if (!fetched) {
            return await safeReply(message, "❌ Could not fetch messages.");
        }

        const messages = fetched.messages.filter(m => m.id !== message.id);
        let deletedCount = 0;
        for (const msg of messages) {
            try {
                await safeApi(() => msg.delete(), 3, 500);
                deletedCount++;
                await sleep(400);
            } catch (e) {
                console.error("Delete failed, retrying once...", e);
                try {
                    await sleep(2000);
                    await safeApi(() => msg.delete());
                    deletedCount++;
                } catch (err) {
                    console.error("Second delete attempt failed:", err);
                }
            }
        }

        const successMsg = config.messages.purgeSuccess.replace("{count}", String(deletedCount));
        const response = await safeReply(message, successMsg);

        await logAction(
            message.server,
            "PURGE",
            message.author,
            message.channel,
            `Deleted ${deletedCount} messages`
        );

        setTimeout(async () => {
            try {
                if (response) {
                    await safeApi(() => response.delete());
                }
                await safeApi(() => message.delete());
            } catch (e) {
                console.error("Could not delete purge messages:", e);
            }
        }, config.purge.deleteDelay);

    } catch (error) {
        console.error("Error purging messages:", error);
        await safeReply(message, "❌ Failed to purge messages.");
    }
}

export async function handleSlowmode(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }
    if (!await hasPermission(member, "ManageChannels")) {
        return await safeReply(message, config.messages.noPermission);
    }

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > config.slowmode.maxDuration) {
        return await safeReply(message, `❌ Please provide a number between 0 and ${config.slowmode.maxDuration} seconds.`);
    }

    try {
        // Note: Revolt API might not support slowmode directly through revolt.js
        // This is a placeholder - you may need to use the REST API directly
        // or wait for revolt.js to add this feature

        await safeReply(
            message,
            `⚠️ Slowmode feature is currently not fully supported by revolt.js. ` +
            `You may need to set this manually in channel settings.\n` +
            `Requested slowmode: ${seconds === 0 ? 'disabled' : `${seconds} seconds`}`
        );

        await logAction(
            message.server,
            "SLOWMODE",
            message.author,
            message.channel,
            `${seconds} seconds`
        );
    } catch (error) {
        console.error("Error setting slowmode:", error);
        await safeReply(message, "❌ Failed to set slowmode.");
    }
}

export async function handleLockdown(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }
    if (!await hasPermission(member, "ManageChannels")) {
        return await safeReply(message, config.messages.noPermission);
    }

    try {
        // Note: Lockdown functionality requires managing channel permissions
        // This is a placeholder implementation
        // You'll need to implement this based on your server's role structure

        await safeReply(
            message,
            `🔒 Channel lockdown feature requires custom implementation based on your server's role structure.\n` +
            `To implement lockdown:\n` +
            `1. Store the current channel permissions\n` +
            `2. Remove 'Send Messages' permission for @everyone role\n` +
            `3. Toggle back to restore permissions\n\n` +
            `This feature will be available in a future update when revolt.js adds better permission management.`
        );

        await logAction(
            message.server,
            "LOCKDOWN_ATTEMPT",
            message.author,
            message.channel,
            "Lockdown toggled (feature in development)"
        );
    } catch (error) {
        console.error("Error toggling lockdown:", error);
        await safeReply(message, "❌ Failed to toggle lockdown.");
    }
}
