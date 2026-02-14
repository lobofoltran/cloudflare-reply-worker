import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const SUPPORT_EMAIL = "support@lobofoltran.dev";
const FORWARD_TO = "gustavoqe.75@gmail.com";

export default {
  async email(message: ForwardableEmailMessage): Promise<void> {
    console.log("Email received", {
      from: message.from,
      to: message.to,
      subject: message.headers.get("Subject") || "",
    });

    await message.forward(FORWARD_TO);
    console.log("Forward executed", { to: FORWARD_TO, originalFrom: message.from });

    const msg = createMimeMessage();
    msg.setHeader("In-Reply-To", message.headers.get("Message-ID"));
    msg.setSender({ name: "Thank you for your contact", addr: SUPPORT_EMAIL });
    msg.setRecipient(message.from);
    msg.setSubject("Email Routing Auto-reply");
    msg.addMessage({
      contentType: 'text/plain',
      data: `Hello,\n\nWe received your message sent to support@lobofoltran.dev.\n\nOur team will respond within 24 hours.\n\nBest regards,\nLobofoltran Support`
    });

    const replyMessage = new EmailMessage(
      SUPPORT_EMAIL,
      message.from,
      msg.asRaw()
    );

    await message.reply(replyMessage);
    console.log("Reply sent", { from: SUPPORT_EMAIL, to: message.from });
  },
} satisfies ExportedHandler;
