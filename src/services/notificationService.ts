import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo client
const expo = new Expo();

/**
 * Sends push notifications in batches to a list of users.
 * This is the robust, production-ready way to send notifications.
 * @param pushTokens An array of Expo Push Tokens for the recipients.
 * @param title The title of the notification.
 * @param body The main message content of the notification.
 * @param data An object of extra data to send with the notification (e.g., a task ID).
 */
export const sendPushNotifications = async (
  pushTokens: string[],
  title: string,
  body: string,
  data: { [key: string]: any }
) => {
  const messages: ExpoPushMessage[] = [];

  // 1. Construct the messages payload, filtering out invalid tokens
  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo Push Token`);
      continue; // Skip this token and move to the next
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  // If there are no valid messages, exit the function.
  if (messages.length === 0) {
    console.log("No valid push tokens provided. No notifications sent.");
    return;
  }

  // 2. Chunk the messages into batches, as Expo's API has a batch size limit.
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  // 3. Send the chunks to the Expo push notification service.
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      console.log("Sent notification chunk, received tickets:", ticketChunk);
    } catch (error) {
      // This catches errors in communicating with the Expo server (e.g., network issues).
      console.error('Error sending push notification chunk:', error);
    }
  }

  // 4. Process the tickets returned from Expo to check for errors.
  for (const ticket of tickets) {
    // A ticket with a "status" of "error" means Expo had a problem delivering the notification.
    if (ticket.status === 'error') {
      console.error('Error ticket found:', ticket);
      if (ticket.details && ticket.details.error) {
        // This is the specific error from Expo's servers.
        console.error(`  - Expo Error: ${ticket.details.error}`);
        
        // Handle specific, common errors.
        if (ticket.details.error === 'DeviceNotRegistered') {
          // This user has uninstalled the app or disabled notifications.
          // Here, you should find the user associated with this token and remove the token from your database.
          console.log(`  - This token is no longer registered. You should remove it from your database.`);
        }
      }
    }
  }
};
