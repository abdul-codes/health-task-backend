import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "./db";

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Sends push notifications to a list of user IDs.
 * @param userIds - A string or an array of strings of user IDs.
 * @param title - The title of the notification.
 * @param body - The body of the notification.
 * @param data - Optional data payload.
 */
export async function sendPushNotifications(
  userIds: string | string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const idArray = Array.isArray(userIds) ? userIds : [userIds];
    if (idArray.length === 0) return;

    // 1. Find all valid push tokens for the given user IDs
    const users = await prisma.user.findMany({
      where: {
        id: { in: idArray },
        expoPushToken: { not: null },
      },
      select: { expoPushToken: true },
    });

    const pushTokens = users
      .map((u) => u.expoPushToken)
      .filter((token): token is string => token !== null);

    if (pushTokens.length === 0) {
      console.log("No valid push tokens found for the specified users.");
      return;
    }

    // 2. Construct the messages
    const messages: ExpoPushMessage[] = [];
    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Token: ${pushToken} is not a valid Expo push token.`);
        continue;
      }
      messages.push({
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      });
    }

    if (messages.length === 0) return;

    // 3. Chunk and send the notifications
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log("Push notification tickets:", ticketChunk);
        // You can add logic here to handle receipts and check for delivery errors
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }
  } catch (error) {
    console.error("Error in sendPushNotifications:", error);
  }
}
