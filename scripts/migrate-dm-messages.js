import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Simple manual .env parser to avoid requiring external dotenv package in npm
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.error(".env file not found at", envPath);
      process.exit(1);
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const env = {};
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        env[match[1]] = val;
      }
    });
    return env;
  } catch (error) {
    console.error("Error loading .env file:", error);
    process.exit(1);
  }
}

const env = loadEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

console.log("Initializing Firebase with project ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  try {
    console.log("Fetching all groups...");
    const groupsSnap = await getDocs(collection(db, "Groups"));
    console.log(`Found ${groupsSnap.size} groups to check.`);

    for (const groupDoc of groupsSnap.docs) {
      const data = groupDoc.data();
      const groupId = groupDoc.id;
      const oldMessages = data.messages || [];

      if (Array.isArray(oldMessages) && oldMessages.length > 0) {
        console.log(`Migrating ${oldMessages.length} messages for group: ${data.groupName} (${groupId})`);

        const messagesSubcoll = collection(db, "Groups", groupId, "Messages");

        for (const msg of oldMessages) {
          // Map older schema properties to unified message structure
          const msgDoc = {
            senderId: msg.senderId || msg.senderID || "system",
            senderName: msg.sender || msg.senderName || "Bilinmeyen",
            senderPhoto: msg.senderPhoto || "/1.png",
            content: msg.content || msg.message || "",
            // Use existing timestamp or fallback to now
            createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          };

          await addDoc(messagesSubcoll, msgDoc);
        }

        // Clear the old messages array field from the group document
        await updateDoc(doc(db, "Groups", groupId), {
          messages: []
        });
        console.log(`Successfully migrated and cleared messages field for group ${groupId}`);
      } else {
        console.log(`No legacy messages array to migrate for group: ${data.groupName} (${groupId})`);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
