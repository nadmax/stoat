import { reactionRoleMessages, saveReactionRoles } from "./storage.js";
import { logAction, logInfo, logError } from "./logger.js";

interface ReactionRoleOptions {
    notifyUsers?: boolean;
}

export const emojiRoleMap = new Map([
    ["🌹", "01KHEP74HNQXF2HJ3H1WQMKY3R"],
    ["🟣", "01KHEPAR5JY662K6H8JAV8VXF1"],
    ["🔵", "01KHEP8SKMPNR9GY24ADQPED5G"],
    ["📘", "01KHEP97QGNVYCBMJE42WDSFZQ"],
    ["🟢", "01KHEP7XP1R9TB9KAW4RBZRS01"],
    ["🟡", "01KHEP9QKBF4HTY0PKS6XK55WB"],
    ["🟠", "01KHEPA3EA4ZG8TW5TRBZ9JVWV"],
    ["🟤", "01KHEP6KJZZS3QB3PPPD1AKW48"],
    ["🔴", "01KHEM216VRQWEVRG26MM0XYEP"],
]);

export const stoatEmojiMap = new Map([
    ["rose", "01KHEP74HNQXF2HJ3H1WQMKY3R"],
    ["purple_circle", "01KHEPAR5JY662K6H8JAV8VXF1"],
    ["large_blue_circle", "01KHEP8SKMPNR9GY24ADQPED5G"],
    ["blue_book", "01KHEP97QGNVYCBMJE42WDSFZQ"],
    ["green_circle", "01KHEP7XP1R9TB9KAW4RBZRS01"],
    ["yellow_circle", "01KHEP9QKBF4HTY0PKS6XK55WB"],
    ["orange_circle", "01KHEPA3EA4ZG8TW5TRBZ9JVWV"],
    ["brown_circle", "01KHEP6KJZZS3QB3PPPD1AKW48"],
    ["red_circle", "01KHEM216VRQWEVRG26MM0XYEP"],
]);

const reactionCooldown = new Map<string, number>();

export function getRoleForEmoji(emoji) {
    if (emojiRoleMap.has(emoji)) {
        return emojiRoleMap.get(emoji);
    }

    if (stoatEmojiMap.has(emoji)) {
        return stoatEmojiMap.get(emoji);
    }

    return null;
}

export function getRoleNameForEmoji(emoji) {
    const roleNames = {
        "🌹": "Rose",
        "🟣": "Purple",
        "🔵": "Dark blue",
        "📘": "Light blue",
        "🟢": "Green",
        "🟡": "Yellow",
        "🟠": "Orange",
        "🟤": "Brown",
        "🔴": "Red",
    };

    return roleNames[emoji] || "Unknown Role";
}

export async function handleReactionAdd(message, userId, emoji) {
    try {
        const messageConfig = reactionRoleMessages.get(message.id);
        if (!messageConfig) {
            return;
        }
        if (!message.server || message.server.id !== messageConfig.serverId) {
            return;
        }

        const roleId = getRoleForEmoji(emoji);
        if (!roleId) {
            logInfo(`Emoji ${emoji} not configured for reaction roles`);
            return;
        }

        const member = await message.server.fetchMember(userId);
        if (!member) {
            logError(`Could not fetch member ${userId}`);
            return;
        }
        if (member.user?.bot) {
            logInfo(`OpenMod is adding emoji ${emoji}`);
            return;
        }

        const key = `${userId}-${message.id}`;
        const now = Date.now();
        const lastAction = reactionCooldown.get(key) || 0;
        if (now - lastAction < 2000) {
            logInfo(`User ${member.user.username} is on cooldown.`);
            return;
        }

        reactionCooldown.set(key, now);

        const currentRoles = member.roles || [];
        if (currentRoles.includes(roleId)) {
            return;
        }

        await member.edit({
            roles: [...currentRoles, roleId]
        });

        const roleName = getRoleNameForEmoji(emoji);
        logInfo(`Added role ${roleName} to ${member.user.username}`);

    } catch (error) {
        logError(
            "Error handling reaction add:",
            error instanceof Error ? error.message : String(error)
        );
    }
}

export async function handleReactionRemove(message, userId, emoji) {
    try {
        const messageConfig = reactionRoleMessages.get(message.id);
        if (!messageConfig) {
            return;
        }

        if (!message.server || message.server.id !== messageConfig.serverId) {
            return;
        }

        const roleId = getRoleForEmoji(emoji);
        if (!roleId) {
            return;
        }

        const member = await message.server.fetchMember(userId);
        if (!member) {
            logError(`Could not fetch member ${userId}`);
            return;
        }

        const roleName = getRoleNameForEmoji(emoji);
        if (!member.roles || !member.roles.includes(roleId)) {
            logInfo(`User ${member.user.username} doesn't have role ${roleName} with ID ${roleId}`);
            return;
        }

        const newRoles = member.roles.filter(r => r !== roleId);

        await member.edit({ roles: newRoles });

        logInfo(`Removed role ${roleName} from ${member.user.username}`);

    } catch (error) {
        logError("Error handling reaction remove:", error);
    }
}

export function isReactionRoleMessage(messageId) {
    return reactionRoleMessages.has(messageId);
}

export function addReactionRoleMessage(
    messageId: string,
    serverId: string,
    options: ReactionRoleOptions = {}
) {
    reactionRoleMessages.set(messageId, {
        serverId,
        notifyUsers: options.notifyUsers ?? true,
        createdAt: Date.now()
    });

    saveReactionRoles();
}

export function removeReactionRoleMessage(messageId) {
    const deleted = reactionRoleMessages.delete(messageId);
    if (deleted) {
        saveReactionRoles();
    }

    return deleted;
}

export function getAllReactionRoleMessages() {
    return Array.from(reactionRoleMessages.entries());
}
