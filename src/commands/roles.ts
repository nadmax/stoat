import { config } from "../config.js";
import { safeReply } from "../utils/api.js";
import { hasPermission } from "../utils/permissions.js";
import {
    addReactionRoleMessage,
    removeReactionRoleMessage,
    getAllReactionRoleMessages,
    emojiRoleMap,
    getRoleNameForEmoji
} from "../utils/roles.js";

export async function handleSetupReactionRoles(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }

    if (!await hasPermission(member, "ManageRoles")) {
        return await safeReply(message, config.messages.noPermission);
    }

    const reactionRoleText =
        `**🎨 Choose Your Color Role**\n\n` +
        `React to this message with an emoji to get the corresponding role:\n\n` +
        `🌹 **Rose**\n` +
        `🟣 **Purple**\n` +
        `🔵 **Dark blue**\n` +
        `📘 **Light blue**\n` +
        `🟢 **Green**\n` +
        `🟡 **Yellow**\n` +
        `🟠 **Orange**\n` +
        `🟤 **Brown**\n` +
        `🔴 **Red**\n\n` +
        `*Remove your reaction to remove the role.*`;

    try {
        const roleMessage = await message.channel.sendMessage(reactionRoleText);

        addReactionRoleMessage(roleMessage.id, message.server.id, {
            notifyUsers: true
        });

        const emojis: string[] = ["🌹", "🟣", "🔵", "📘", "🟢", "🟡", "🟠", "🟤", "🔴"];
        const addReactionWithRetry = async (emoji, retries = 2) => {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    await roleMessage.react(emoji);
                    return true;
                } catch (e) {
                    if (attempt === retries) {
                        return false;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
            return false;
        };

        for (const emoji of emojis) {
            await addReactionWithRetry(emoji);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error("Error creating reaction role message:", error);
        await safeReply(message, "❌ Failed to create reaction role message.");
    }
}

export async function handleRemoveReactionRole(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }

    if (!await hasPermission(member, "ManageRoles")) {
        return await safeReply(message, config.messages.noPermission);
    }

    const messageId = args[0];
    if (!messageId) {
        return await safeReply(message, "❌ Please provide a message ID to remove from reaction roles.");
    }

    const removed = removeReactionRoleMessage(messageId);

    if (removed) {
        await safeReply(message, "✅ Reaction role message removed.");
    } else {
        await safeReply(message, "❌ Message not found in reaction role list.");
    }
}

export async function handleListReactionRoles(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }

    const reactionRoles = getAllReactionRoleMessages();

    if (reactionRoles.length === 0) {
        return await safeReply(message, "No reaction role messages configured.");
    }

    let listText = `**📋 Reaction Role Messages** (${reactionRoles.length} total)\n\n`;

    for (const [messageId, config] of reactionRoles) {
        if (config.serverId === message.server.id) {
            const date = new Date(config.createdAt).toLocaleDateString();
            listText += `**Message ID:** ${messageId}\n`;
            listText += `Created: ${date} | Notify: ${config.notifyUsers ? "Yes" : "No"}\n\n`;
        }
    }

    await safeReply(message, listText);
}

export async function handleUpdateRoleMap(message, args, member) {
    if (!message.server) {
        return await safeReply(message, config.messages.serverOnly);
    }

    if (!await hasPermission(member, "ManageRoles")) {
        return await safeReply(message, config.messages.noPermission);
    }

    let mapText = `**🎨 Current Emoji → Role Mapping**\n\n`;

    for (const [emoji, roleId] of emojiRoleMap.entries()) {
        const roleName = getRoleNameForEmoji(emoji);
        mapText += `${emoji} → **${roleName}** (\`${roleId}\`)\n`;
    }

    mapText += `\n*To update role IDs, edit \`utils/reactionroles.js\`*`;

    await safeReply(message, mapText);
}
