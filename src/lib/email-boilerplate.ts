/**
 * Proven Outlook-safe email wrapper.
 *
 * Placeholders replaced by email-render.ts:
 *  - {{subject}}  → campaign subject line (used in <title>)
 *  - {{content}}  → the user's email body HTML
 */
export const EMAIL_BOILERPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<title>{{subject}}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<style type="text/css">
  table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { -ms-interpolation-mode: bicubic; }
</style>
<![endif]-->
<style type="text/css">
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-font-smoothing: antialiased; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  table { border-collapse: collapse !important; }
  a { color: inherit; }
  @media only screen and (max-width: 600px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7;">
<div style="display: none; max-height: 0; overflow: hidden;">{{preview}}</div>
{{content}}
</body>
</html>`;
