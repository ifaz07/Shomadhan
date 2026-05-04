const { Resend } = require("resend");

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(process.env.RESEND_API_KEY);
};

const getFromAddress = () => {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
};

const htmlToText = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const sendEmail = async ({ to, subject, html, text, fromName = "Shomadhan" }) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  const resend = getResendClient();
  const from = `${fromName} <${getFromAddress()}>`;

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || htmlToText(html),
  });

  if (error) {
    throw new Error(error.message || "Failed to send email with Resend.");
  }

  console.log(`Email successfully sent to ${Array.isArray(to) ? to.join(", ") : to}. Resend ID: ${data?.id}`);
  return data;
};

module.exports = { sendEmail };
