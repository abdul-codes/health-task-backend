import { Expo } from "expo-server-sdk";
import { prisma } from "./db";

// Create a new Expo SDK client
const expo = new Expo();

export async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    // Find the user and their push token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });

    if (!user || !user.expoPushToken) {
      console.log(`User ${userId} does not have a push token.`);
      return;
    }

    // Check if the token is a valid Expo push token
    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.error(`Push token ${user.expoPushToken} is not a valid Expo push token`);
      return;
    }

    // Construct a message
    const message = {
      to: user.expoPushToken,
      sound: "default" as const,
      title,
      body,
      data: data || {},
    };

    // The Expo push notification service accepts an array of messages,
    // so we'll wrap our message in an array.
    const chunks = expo.chunkPushNotifications([message]);

    // Send the chunks to the Expo push notification service.
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log("Push notification ticket chunk:", ticketChunk);
        // NOTE: If you want to handle failures, you should save the ticket and check for errors later.
        // For example, you might want to remove invalid tokens from your database.
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}
