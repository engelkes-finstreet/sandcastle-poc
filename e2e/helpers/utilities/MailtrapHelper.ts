import { MailtrapClient } from "mailtrap";
import { Message } from "mailtrap/dist/types/api/messages";

export interface MailtrapConfig {
  apiToken: string;
  inboxId: string;
  accountId: string;
}

export class MailtrapHelper {
  private client: MailtrapClient;
  private config: MailtrapConfig;

  constructor(config?: Partial<MailtrapConfig>) {
    this.config = {
      apiToken: config?.apiToken || process.env.MAILTRAP_API_TOKEN || "",
      inboxId: config?.inboxId || process.env.MAILTRAP_INBOX_ID || "",
      accountId: config?.accountId || process.env.MAILTRAP_ACCOUNT_ID || "",
    };

    if (!this.config.apiToken) {
      throw new Error("Mailtrap API token is required");
    }

    this.client = new MailtrapClient({
      token: this.config.apiToken,
      testInboxId: Number(this.config.inboxId),
      accountId: Number(this.config.accountId),
    });
  }

  /**
   * Get the latest email for a specific recipient
   * @param recipientEmail - The email address to search for
   * @param maxAge - Maximum age of the email in milliseconds (default: 5 minutes)
   */
  async getLatestEmail(
    recipientEmail: string,
    maxAge: number = 5 * 60 * 1000,
  ): Promise<Message | null> {
    try {
      const messages = await this.client.testing.messages.get(
        Number(this.config.inboxId),
      );

      if (!messages || messages.length === 0) {
        return null;
      }

      // Filter messages by recipient and age
      const now = Date.now();
      const relevantMessages = messages.filter((msg) => {
        const messageTime = new Date(msg.created_at).getTime();
        const isRecent = now - messageTime <= maxAge;
        const isForRecipient = msg.to_email
          .toLowerCase()
          .includes(recipientEmail.toLowerCase());
        return isRecent && isForRecipient;
      });

      // Sort by creation date (newest first) and return the latest
      relevantMessages.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return relevantMessages[0] || null;
    } catch (error) {
      console.error("Error fetching emails from Mailtrap:", error);
      return null;
    }
  }

  /**
   * Wait for an email to arrive for a specific recipient
   * @param recipientEmail - The email address to wait for
   * @param maxWaitTime - Maximum time to wait in milliseconds (default: 30 seconds)
   * @param checkInterval - How often to check for new emails in milliseconds (default: 2 seconds)
   */
  async waitForEmail(
    recipientEmail: string,
    maxWaitTime: number = 30000,
    checkInterval: number = 2000,
  ): Promise<Message | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const email = await this.getLatestEmail(recipientEmail, maxWaitTime);

      if (email) {
        return email;
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    console.warn(
      `No email found for ${recipientEmail} after waiting ${maxWaitTime}ms`,
    );
    return null;
  }

  /**
   * Extract a link from email HTML content using a pattern
   * @param messageId - The ID of the message
   * @param linkPattern - Regex pattern to match the link (default: matches any http/https URL including query params)
   */
  async extractLinkFromEmail(
    messageId: number,
    linkPattern: RegExp = /https?:\/\/[^\s"'<>]+(?:\?[^\s"'<>]+)?/g,
  ): Promise<string | null> {
    try {
      // Get the HTML content of the message
      const htmlContent = await this.client.testing.messages.getHtmlMessage(
        Number(this.config.inboxId),
        messageId,
      );

      if (!htmlContent) {
        // Try to get text content as fallback
        const textContent = await this.client.testing.messages.getTextMessage(
          Number(this.config.inboxId),
          messageId,
        );

        if (!textContent) {
          return null;
        }

        const matches = textContent.match(linkPattern);
        return matches ? this.cleanupHtmlEntities(matches[0]) : null;
      }

      // For HTML content, try to find links in href attributes first
      const hrefPattern = /href=["']([^"']+)["']/gi;
      const hrefMatches = htmlContent.match(hrefPattern);

      if (hrefMatches && hrefMatches.length > 0) {
        // Extract the URL from the href attribute
        const urlMatch = hrefMatches[0].match(/href=["']([^"']+)["']/i);
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1];
          // Only return if it matches our link pattern
          if (linkPattern.test(url)) {
            return this.cleanupHtmlEntities(url);
          }
        }
      }

      // Fallback to general pattern matching
      const matches = htmlContent.match(linkPattern);
      if (matches && matches.length > 0) {
        return this.cleanupHtmlEntities(matches[0]);
      }

      return null;
    } catch (error) {
      console.error("Error extracting link from email:", error);
      return null;
    }
  }

  /**
   * Extract an invitation link specifically (looks for common invitation patterns)
   * @param messageId - The ID of the message
   */
  async extractInvitationLink(messageId: number): Promise<string | null> {
    // Common patterns for invitation links
    const patterns = [/https?:\/\/[^\s"'<>]*\/accept-invitation[^\s"'<>]*/gi];

    for (const pattern of patterns) {
      const link = await this.extractLinkFromEmail(messageId, pattern);
      if (link) {
        // Workaround for backend bug: replace accept-invitation with einladung-annehmen
        const fixedLink = link
          .replace("/accept-invitation", "/einladung-annehmen")
          .replace(
            "https://fe.staging.bfw.ecoscale.finstreet.app",
            "http://localhost:3000",
          );
        return fixedLink;
      }
    }

    // Fallback: return the first link found
    const fallbackLink = await this.extractLinkFromEmail(messageId);
    if (fallbackLink) {
      return fallbackLink
        .replace(
          "https://fe.staging.bfw.ecoscale.finstreet.app",
          "http://localhost:3000",
        )
        .replace("/accept-invitation", "/einladung-annehmen");
    }

    return null;
  }

  /**
   * Get email HTML content for a specific message
   * @param messageId - The ID of the message to retrieve
   */
  async getEmailHtmlContent(messageId: number): Promise<string | null> {
    try {
      const htmlContent = await this.client.testing.messages.getHtmlMessage(
        Number(this.config.inboxId),
        messageId,
      );

      return htmlContent || null;
    } catch (error) {
      console.error("Error fetching email HTML content:", error);
      return null;
    }
  }

  /**
   * Get email text content for a specific message
   * @param messageId - The ID of the message to retrieve
   */
  async getEmailTextContent(messageId: number): Promise<string | null> {
    try {
      const textContent = await this.client.testing.messages.getTextMessage(
        Number(this.config.inboxId),
        messageId,
      );

      return textContent || null;
    } catch (error) {
      console.error("Error fetching email text content:", error);
      return null;
    }
  }

  /**
   * Delete a specific email
   * @param messageId - The ID of the message to delete
   */
  async deleteEmail(messageId: number): Promise<boolean> {
    try {
      await this.client.testing.messages.deleteMessage(
        Number(this.config.inboxId),
        messageId,
      );
      return true;
    } catch (error) {
      console.error("Error deleting email:", error);
      return false;
    }
  }

  /**
   * Clear all emails in the inbox
   * Note: This needs to be implemented by deleting each message individually
   * as Mailtrap API doesn't have a bulk delete endpoint
   */
  async clearInbox(): Promise<boolean> {
    try {
      const messages = await this.client.testing.messages.get(
        Number(this.config.inboxId),
      );

      if (!messages || messages.length === 0) {
        return true;
      }

      // Delete each message
      const deletePromises = messages.map((msg) => this.deleteEmail(msg.id));

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error("Error clearing inbox:", error);
      return false;
    }
  }

  /**
   * Get all emails in the inbox
   */
  async getAllEmails(): Promise<Message[]> {
    try {
      const messages = await this.client.testing.messages.get(
        Number(this.config.inboxId),
      );
      return messages || [];
    } catch (error) {
      console.error("Error fetching all emails:", error);
      return [];
    }
  }

  /**
   * Get all emails for a specific recipient
   * @param recipientEmail - The email address to search for
   * @param maxAge - Optional maximum age of emails in milliseconds
   */
  async getEmailsForRecipient(
    recipientEmail: string,
    maxAge?: number,
  ): Promise<Message[]> {
    try {
      const messages = await this.client.testing.messages.get(
        Number(this.config.inboxId),
      );

      if (!messages || messages.length === 0) {
        return [];
      }

      // Filter messages by recipient
      let filteredMessages = messages.filter((msg) =>
        msg.to_email.toLowerCase().includes(recipientEmail.toLowerCase()),
      );

      // Optionally filter by age
      if (maxAge !== undefined) {
        const now = Date.now();
        filteredMessages = filteredMessages.filter((msg) => {
          const messageTime = new Date(msg.created_at).getTime();
          return now - messageTime <= maxAge;
        });
      }

      // Sort by creation date (newest first)
      filteredMessages.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return filteredMessages;
    } catch (error) {
      console.error("Error fetching emails for recipient:", error);
      return [];
    }
  }

  /**
   * Count emails with specific subject for a recipient
   * @param recipientEmail - The email address to search for
   * @param subject - The subject to match (partial match)
   * @param maxAge - Optional maximum age of emails in milliseconds
   */
  async countEmailsWithSubject(
    recipientEmail: string,
    subject: string,
    maxAge?: number,
  ): Promise<number> {
    const emails = await this.getEmailsForRecipient(recipientEmail, maxAge);

    const matchingEmails = emails.filter((email) =>
      email.subject.toLowerCase().includes(subject.toLowerCase()),
    );

    return matchingEmails.length;
  }

  /**
   * Wait for a specific number of emails with a subject for a recipient
   * @param recipientEmail - The email address to wait for
   * @param subject - The subject to match
   * @param expectedCount - The expected number of emails
   * @param maxWaitTime - Maximum time to wait in milliseconds
   */
  async waitForEmailCount(
    recipientEmail: string,
    subject: string,
    expectedCount: number,
    maxWaitTime: number = 30000,
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000;

    while (Date.now() - startTime < maxWaitTime) {
      const count = await this.countEmailsWithSubject(
        recipientEmail,
        subject,
        maxWaitTime,
      );

      if (count >= expectedCount) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    console.warn(
      `Expected ${expectedCount} emails with subject "${subject}" for ${recipientEmail}, but only found ${await this.countEmailsWithSubject(recipientEmail, subject)}`,
    );
    return false;
  }

  /**
   * Get the nth email with a specific subject for a recipient
   * @param recipientEmail - The email address to search for
   * @param subject - The subject to match
   * @param index - The index of the email to get (0-based, 0 = newest)
   */
  async getNthEmailWithSubject(
    recipientEmail: string,
    subject: string,
    index: number = 0,
  ): Promise<Message | null> {
    const emails = await this.getEmailsForRecipient(recipientEmail);

    const matchingEmails = emails.filter((email) =>
      email.subject.toLowerCase().includes(subject.toLowerCase()),
    );

    if (matchingEmails.length > index) {
      return matchingEmails[index];
    }

    return null;
  }

  /**
   * Wait for an email with specific subject
   * @param subject - The subject to search for
   * @param recipientEmail - Optional recipient email to filter by
   * @param maxWaitTime - Maximum time to wait in milliseconds
   */
  async waitForEmailBySubject(
    subject: string,
    recipientEmail?: string,
    maxWaitTime: number = 30000,
  ): Promise<Message | null> {
    const startTime = Date.now();
    const checkInterval = 2000;

    while (Date.now() - startTime < maxWaitTime) {
      const emails = await this.getAllEmails();

      const matchingEmail = emails.find((email) => {
        const subjectMatches = email.subject
          .toLowerCase()
          .includes(subject.toLowerCase());
        const recipientMatches = recipientEmail
          ? email.to_email.toLowerCase().includes(recipientEmail.toLowerCase())
          : true;
        return subjectMatches && recipientMatches;
      });

      if (matchingEmail) {
        return matchingEmail;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return null;
  }

  /**
   * Get the full message details
   * @param messageId - The ID of the message
   */
  async getMessageDetails(messageId: number): Promise<Message | null> {
    try {
      const message = await this.client.testing.messages.showEmailMessage(
        Number(this.config.inboxId),
        messageId,
      );
      return message;
    } catch (error) {
      console.error("Error fetching message details:", error);
      return null;
    }
  }

  /**
   * Mark a message as read
   * @param messageId - The ID of the message
   */
  async markAsRead(messageId: number): Promise<boolean> {
    try {
      await this.client.testing.messages.updateMessage(
        Number(this.config.inboxId),
        messageId,
        { isRead: true },
      );
      return true;
    } catch (error) {
      console.error("Error marking message as read:", error);
      return false;
    }
  }

  /**
   * Helper method to clean up HTML entities from extracted links
   */
  private cleanupHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/");
  }
}
