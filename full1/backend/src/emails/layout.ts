// Shared HTML email shell used by every template. Inline styles only —
// most email clients strip <style> blocks and external CSS.
export interface LayoutOptions {
  title: string;
  preheader?: string;
}

const ACCENT = '#0d7a66';
const DARK = '#12201d';

export function emailLayout(
  { title, preheader }: LayoutOptions,
  content: string,
): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f7f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(18,32,29,0.08);">
            <!-- Header -->
            <tr>
              <td align="center" style="background-color:${DARK};padding:28px 32px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Triplora</span>
                <span style="display:block;margin-top:4px;font-size:12px;color:#9db8b2;letter-spacing:2px;text-transform:uppercase;">Kerala, reimagined</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 32px;color:#22332e;font-size:15px;line-height:1.7;">
                ${content}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color:#eef4f2;padding:20px 32px;border-top:1px solid #dce7e3;text-align:center;font-size:12px;color:#6b7f79;line-height:1.6;">
                <p style="margin:0 0 6px;">You received this email because of your activity on <strong style="color:#12201d;">Triplora</strong>.</p>
                <p style="margin:0;">Triplora · Kerala Tourism Platform · <a href="mailto:support@triplora.travel" style="color:#0d7a66;text-decoration:underline;">support@triplora.travel</a></p>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;margin:14px auto 0;font-size:11px;color:#8aa29b;text-align:center;line-height:1.5;">
            If this email was not intended for you, please ignore it. Never share your passwords or verification links with anyone.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#12201d;">${text}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

export function emailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border-radius:999px;background-color:${ACCENT};">
        <a href="${url}" target="_blank" rel="noopener"
           style="display:inline-block;padding:13px 32px;border-radius:999px;background-color:${ACCENT};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function emailButtons(buttons: Array<{ label: string; url: string; primary?: boolean }>): string {
  const cells = buttons
    .map((b) => {
      const primary = b.primary !== false;
      const style = primary
        ? `border-radius:999px;background-color:${ACCENT};color:#ffffff;border:1px solid ${ACCENT};`
        : `border-radius:999px;background-color:#ffffff;color:${DARK};border:1px solid #b8d0c9;`;
      return `<td align="center" style="padding:0 4px 8px;">
        <a href="${b.url}" target="_blank" rel="noopener"
           style="display:inline-block;padding:12px 26px;border-radius:999px;${style}font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;">${b.label}</a>
      </td>`;
    })
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>${cells}</tr></table>`;
}

export function emailMutedLink(label: string, url: string): string {
  return `<p style="margin:8px 0 20px;font-size:13px;color:#6b7f79;">Or copy this link into your browser:<br /><a href="${url}" style="color:${ACCENT};word-break:break-all;">${url}</a></p>`;
}

export function emailDivider(): string {
  return `<div style="height:1px;background-color:#e2ece8;margin:24px 0;"></div>`;
}
