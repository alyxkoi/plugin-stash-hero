// Order confirmation + contact notification HTML, verbatim from the supplied
// Resend templates. Do not hand-edit; regenerate from the source HTML instead.
/* eslint-disable */

export const ORDER_CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your download links</title>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght,ROND@6..144,75..125,300..1000,0..100&amp;family=Google+Sans+Code:wght@400;500;700&amp;display=swap" rel="stylesheet">
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght,ROND@6..144,75..125,300..1000,0..100&family=Google+Sans+Code:wght@400;500;700&display=swap');
  body { margin:0; padding:0; width:100% !important; background-color:#08061F; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; display:block; }
  a { text-decoration:none; }
  .code { font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; }
  @media only screen and (max-width:620px) {
    .w600 { width:100% !important; }
    .gut { padding-left:16px !important; padding-right:16px !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .fig { font-size:74px !important; line-height:70px !important; }
    .hl  { font-size:40px !important; line-height:40px !important; }
    .heroimg { width:100% !important; height:auto !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body bgcolor="#08061F" style="margin:0; padding:0; background-color:#08061F;">
<div style="display:none; font-size:1px; color:#08061F; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
Everything you just bought, ready to download.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#08061F" style="background-color:#08061F;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="w600" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

<tr>
<td class="gut" style="padding:36px 24px 0 24px;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="140" alt="Plugin Warehouse" style="width:140px; height:auto;">
</td>
</tr>

<tr>
<td class="gut" style="padding:46px 24px 0 24px;">
  <div class="hl" style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 105; font-size:54px; line-height:52px; font-weight:800; color:#FFFFFF; letter-spacing:-1.6px;">
    DOWNLOAD<br>TIME.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">
    Payment went through. Every file below is yours for good, and you can come back and re download any of them from your account whenever you need to.
  </div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{ORDER_NUMBER}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">{{ORDER_TOTAL}} PAID</span>
        </td>
      </tr></table>
    </td>
  </tr></table>

  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; padding-top:12px; font-weight:600;">ORDER &#183; {{ORDER_DATE}}</div>
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="{{HERO_DOWNLOAD_URL}}"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="6" bgcolor="#FA1265" style="height:6px; background-color:#FA1265; font-size:0; line-height:0; border-radius:0 0 3px 3px;">&nbsp;</td>
      </tr></table>
    </td>
    </tr>
    <tr>
    <td class="pad" style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding:0;">
          <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:23px; line-height:27px; font-weight:800; color:#FFFFFF;">{{HERO_NAME}}</div>
        </td>
        <td valign="middle" align="right" style="padding:0 0 0 16px; white-space:nowrap;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:26px; font-weight:700; color:#FA1265;">{{HERO_PRICE}}</span><br>
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:400; color:#6E6690; text-decoration:line-through;">{{HERO_ORIGINAL}}</span>
        </td>
      </tr></table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="{{HERO_DOWNLOAD_URL}}" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">DOWNLOAD {{HERO_NAME}} &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional purchased item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="{{ITEM_DOWNLOAD_URL}}"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td bgcolor="#FA1265" style="background-color:#FA1265; border-radius:9px;">
                <a href="{{ITEM_DOWNLOAD_URL}}" style="display:block; padding:11px 18px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:13px; font-weight:800; color:#FFFFFF; letter-spacing:0.5px;">DOWNLOAD</a>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:26px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.6px; color:#8E86B4; font-weight:600;">TOTAL PAID</td>
          <td valign="middle" align="right" class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:24px; font-weight:700; color:#FFFFFF;">{{ORDER_TOTAL}}</td>
        </tr>
      </table>
    </td>
    </tr>

  </table>
</td>
</tr>
<tr><td height="18" style="height:18px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#2E2750" style="background-color:#2E2750; border-radius:20px;">
    <tr>
    <td class="pad" style="padding:32px 30px 34px 30px;">
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">Something not working?</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Send us a message and a real person will answer. Large files download best on a wired connection.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/contact-us" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">GET HELP &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
<tr><td align="center" style="padding:0;">
  <table role="presentation" class="w600" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
    <tr>
    <td class="gut" align="center" style="padding:34px 24px 36px 24px;">
      <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Dark.png" width="132" alt="Plugin Warehouse" style="width:132px; height:auto; margin:0 auto;">
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#08061F; padding-top:18px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#08061F; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#08061F; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/account" style="color:#08061F; text-decoration:underline;">My account</a>
      </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:12px;">This is a receipt for your order, so it is not something you can unsubscribe from.</div>
    </td>
    </tr>
  </table>
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>
`;

export const CONTACT_MESSAGE_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>New contact message</title>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght,ROND@6..144,75..125,300..1000,0..100&amp;family=Google+Sans+Code:wght@400;500;700&amp;display=swap" rel="stylesheet">
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght,ROND@6..144,75..125,300..1000,0..100&family=Google+Sans+Code:wght@400;500;700&display=swap');
  body { margin:0; padding:0; width:100% !important; background-color:#08061F; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; display:block; }
  a { text-decoration:none; }
  .code { font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; }
  @media only screen and (max-width:620px) {
    .w600 { width:100% !important; }
    .gut { padding-left:16px !important; padding-right:16px !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .fig { font-size:74px !important; line-height:70px !important; }
    .hl  { font-size:40px !important; line-height:40px !important; }
    .heroimg { width:100% !important; height:auto !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body bgcolor="#08061F" style="margin:0; padding:0; background-color:#08061F;">
<div style="display:none; font-size:1px; color:#08061F; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
{{SUBMITTER_NAME}} sent a message through the contact form.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#08061F" style="background-color:#08061F;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="w600" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

<tr>
<td class="gut" style="padding:36px 24px 0 24px;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="140" alt="Plugin Warehouse" style="width:140px; height:auto;">
</td>
</tr>

<tr>
<td class="gut" style="padding:46px 24px 0 24px;">
  <div class="hl" style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 105; font-size:54px; line-height:52px; font-weight:800; color:#FFFFFF; letter-spacing:-1.6px;">
    NEW<br>MESSAGE.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">
    Someone filled out the contact form. Hitting reply on this email goes straight back to them.
  </div>
</td>
</tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:30px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="110" valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.5px; color:#8E86B4; font-weight:600;">FROM</td>
          <td valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:17px; font-weight:700; color:#FFFFFF;">{{SUBMITTER_NAME}}</td>
        </tr>
        <tr>
          <td width="110" valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.5px; color:#8E86B4; font-weight:600;">EMAIL</td>
          <td valign="top" class="code" style="padding:0 0 14px 0; font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:15px; color:#FA1265;"><a href="mailto:{{SUBMITTER_EMAIL}}" style="color:#FA1265;">{{SUBMITTER_EMAIL}}</a></td>
        </tr>
        <tr>
          <td width="110" valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.5px; color:#8E86B4; font-weight:600;">SUBJECT</td>
          <td valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; font-weight:700; color:#FFFFFF;">{{SUBJECT}}</td>
        </tr>
        <tr>
          <td width="110" valign="top" style="padding:0 0 14px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.5px; color:#8E86B4; font-weight:600;">ORDER</td>
          <td valign="top" class="code" style="padding:0 0 14px 0; font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:15px; color:#C9C2E4;">{{ORDER_ID}}</td>
        </tr>
        <tr>
          <td width="110" valign="top" style="padding:0 0 4px 0; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; letter-spacing:1.5px; color:#8E86B4; font-weight:600;">RECEIVED</td>
          <td valign="top" class="code" style="padding:0 0 4px 0; font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:15px; color:#C9C2E4;">{{RECEIVED_AT}}</td>
        </tr>
      </table>
    </td>
    </tr>
    <tr>
    <td class="pad" style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
      </tr></table>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:26px; color:#FFFFFF; padding-top:22px; white-space:pre-wrap;">{{MESSAGE_BODY}}</div>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="mailto:{{SUBMITTER_EMAIL}}?subject=Re:%20{{SUBJECT}}" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">REPLY TO {{SUBMITTER_NAME}} &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>

  </table>
</td>
</tr>
<tr><td height="18" style="height:18px; font-size:0; line-height:0;">&nbsp;</td></tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
<tr><td align="center" style="padding:0;">
  <table role="presentation" class="w600" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
    <tr>
    <td class="gut" align="center" style="padding:34px 24px 36px 24px;">
      <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Dark.png" width="132" alt="Plugin Warehouse" style="width:132px; height:auto; margin:0 auto;">
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#08061F; padding-top:18px;">
        <a href="https://www.thepluginwarehouse.com/dashboard/orders" style="color:#08061F; text-decoration:underline;">Open the dashboard</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com" style="color:#08061F; text-decoration:underline;">Storefront</a>
      </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:12px;">Internal notification. This one is only ever sent to you.</div>
    </td>
    </tr>
  </table>
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>
`;
