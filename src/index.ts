import { EmailMessage } from "cloudflare:email";

const SUPPORT_EMAIL = "support@lobofoltran.dev";
const FORWARD_TO = "gustavoqe.75@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSubject(subject: string | null): string {
  const clean = (subject ?? "").trim();
  return /^re:/i.test(clean) ? clean : `Re: ${clean || "Support request"}`;
}

function buildThreadingHeaders(headers: Headers): { inReplyTo: string; references: string } {
  const incomingInReplyTo = (headers.get("In-Reply-To") || "").trim();
  const incomingReferences = (headers.get("References") || "").trim();
  const messageId = (headers.get("Message-ID") || "").trim();

  const inReplyTo = incomingInReplyTo || messageId;
  const references = incomingReferences || messageId;

  return { inReplyTo, references };
}

function buildRawMimeReply(from: string, incomingHeaders: Headers): string {
  const boundary = `cf-boundary-${crypto.randomUUID()}`;
  const { inReplyTo, references } = buildThreadingHeaders(incomingHeaders);
  const subject = normalizeSubject(incomingHeaders.get("Subject"));

  const textBody = `Hello,\n\nWe received your message sent to support@lobofoltran.dev.\n\nOur team will respond within 24 hours.\n\nBest regards,\nLobofoltran Support`;

  const htmlBody = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
    <h1 style="font-size:20px;margin:0 0 16px;">Support request received</h1>
    <p style="margin:0 0 8px;"><strong>Sender email:</strong> ${escapeHtml(from)}</p>
    <p style="margin:0 0 8px;"><strong>Status:</strong> Open</p>
    <p style="margin:0;"><strong>Response time:</strong> 24 hours</p>
  </body>
</html>`;

  const lines = [
    `From: ${SUPPORT_EMAIL}`,
    `To: ${from}`,
    `Subject: ${subject}`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(references ? [`References: ${references}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
    "",
  ];

  return lines.join("\r\n");
}

export default {
  async email(message: ForwardableEmailMessage): Promise<void> {
    console.log("Email received", {
      from: message.from,
      to: message.to,
      subject: message.headers.get("Subject") || "",
    });

    await message.forward(FORWARD_TO);
    console.log("Forward executed", { to: FORWARD_TO, originalFrom: message.from });

    if (message.headers.has("Auto-Submitted")) {
      return;
    }

    const raw = buildRawMimeReply(message.from, message.headers);
    const reply = new EmailMessage(SUPPORT_EMAIL, message.from, raw);

    await message.reply(reply);
    console.log("Reply sent", { from: SUPPORT_EMAIL, to: message.from });
  },
} satisfies ExportedHandler;
