import { Resend } from "resend";
import { getCloudflareEnv } from "./db";
import { APP_NAME } from "./constants";

type SendEmailInput = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  action?: { label: string; url: string };
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmail({ heading, body, action }: SendEmailInput) {
  const actionMarkup = action
    ? `<p style="margin:28px 0"><a href="${action.url}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(action.label)}</a></p>
       <p style="color:#6b7280;font-size:12px;line-height:1.6">Jika tombol tidak berfungsi, buka tautan berikut:<br /><span style="word-break:break-all">${escapeHtml(action.url)}</span></p>`
    : "";

  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <p style="margin:0 0 24px;font-size:18px;font-weight:700">${APP_NAME}</p>
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${escapeHtml(heading)}</h1>
        <div style="color:#4b5563;font-size:15px;line-height:1.7">${escapeHtml(body)}</div>
        ${actionMarkup}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">Email ini dikirim oleh ${APP_NAME}.</p>
    </div>
  </body>
</html>`;
}

function renderText({ heading, body, action }: SendEmailInput) {
  return [APP_NAME, "", heading, "", body, action ? `\n${action.label}: ${action.url}` : ""]
    .join("\n")
    .trim();
}

export async function sendEmail(input: SendEmailInput) {
  const env = await getCloudflareEnv();
  const html = renderEmail(input);

  if (!env.RESEND_API_KEY) {
    console.info(
      `[email:dev] to=${input.to} subject="${input.subject}"${
        input.action ? ` url=${input.action.url}` : ""
      }`,
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  // The SDK returns errors instead of throwing, so failures would otherwise vanish silently.
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html,
    text: renderText(input),
  });

  if (error) {
    console.error(`[email] failed to=${input.to} subject="${input.subject}"`, error);
    throw new Error(`Gagal mengirim email: ${error.message}`);
  }
}
