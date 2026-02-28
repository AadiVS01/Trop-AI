import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";
import * as dotenv from "dotenv";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
const apiHash = process.env.TELEGRAM_API_HASH || "";
const session = new StringSession(process.env.TELEGRAM_SESSION || "");

async function main() {
    const inviteLink = process.argv[2];
    if (!inviteLink) {
        console.error("❌ Usage: npx tsx scripts/join-channel.ts <invite-link>");
        process.exit(1);
    }

    if (!apiId || !apiHash || !process.env.TELEGRAM_SESSION) {
        console.error("❌ TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION must be set.");
        process.exit(1);
    }

    console.log(`Joining: ${inviteLink}...`);

    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.connect();

    try {
        // inviteLink can be like https://t.me/+44liocfo9ZpmYWE1
        const hash = inviteLink.split('/').pop()?.replace('+', '');
        if (!hash) {
            throw new Error("Invalid invite link format");
        }

        const result = await client.invoke(
            new Api.messages.ImportChatInvite({
                hash: hash,
            })
        );
        console.log("✅ Successfully joined the channel!");
    } catch (err: any) {
        if (err.errorMessage === 'USER_ALREADY_PARTICIPANT') {
            console.log("✅ You are already a participant of this channel.");
        } else {
            console.error("❌ Failed to join:", err.errorMessage || err);
        }
    }

    await client.disconnect();
}

main().catch(console.error);
