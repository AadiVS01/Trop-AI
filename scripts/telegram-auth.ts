import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
// @ts-ignore
import input from "input";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
const apiHash = process.env.TELEGRAM_API_HASH || "";
const stringSession = new StringSession(""); // Start with empty session

async function main() {
    if (!apiId || !apiHash) {
        console.error("❌ Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in your .env file.");
        process.exit(1);
    }

    console.log("--- Telegram Auth Helper ---");
    console.log("Connecting to Telegram...");

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("Please enter your phone number (with country code): "),
        password: async () => await input.text("Please enter your 2FA password (if any): "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    console.log("\n✅ Successfully authenticated!");
    const sessionString = client.session.save();
    console.log("\n--- YOUR SESSION STRING ---");
    console.log(sessionString);
    console.log("----------------------------");
    console.log("\n👉 ACTION REQUIRED: Copy the session string above and add it to your .env file as TELEGRAM_SESSION='...'");

    await client.disconnect();
}

main().catch(console.error);
