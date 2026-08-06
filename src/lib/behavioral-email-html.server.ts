// Behavioral email HTML, verbatim from the provided templates.
// Do not hand-edit: these are the shipped Resend templates for the
// abandoned-cart and saved-items sequences.
/* eslint-disable */

export const CART_1_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>You left this behind</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]><style>*{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  body{margin:0 !important;padding:0 !important;width:100% !important;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:44px !important;line-height:42px !important;}
    .bigprice{font-size:72px !important;line-height:66px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0B0018;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0B0018;opacity:0;">Your cart is still holding it — but not forever.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0018" style="background-color:#0B0018;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- LOGO BAR -->
<tr><td align="left" bgcolor="#0B0018" style="background-color:#0B0018;padding:22px 24px 20px 24px;border-bottom:1px solid #241243;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="150" alt="The Plugin Warehouse" style="width:150px;height:auto;">
</td></tr>

<!-- HEADLINE BLOCK -->
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:38px 32px 34px 32px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#FF003C;padding-bottom:12px;">Still in your cart</div>
  <div class="h1" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:58px;line-height:54px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">You left this behind</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:500;font-size:17px;line-height:25px;color:#C9BEDD;padding-top:14px;">Your cart's still holding it. That won't last forever.</div>
</td></tr>

<!-- HERO IMAGE -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:0;">
  <a href="{{HERO_URL}}" target="_blank"><img src="{{HERO_IMAGE}}" width="600" alt="{{HERO_NAME}}" style="width:100%;max-width:600px;height:auto;"></a>
</td></tr>

<!-- NAME -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:26px 30px 16px 30px;">
  <div style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:26px;line-height:30px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">{{HERO_NAME}}</div>
</td></tr>

<!-- PRICE SLAB -->
<tr><td align="center" bgcolor="#FF003C" style="background-color:#FF003C;padding:24px 24px 26px 24px;">
  {{#HERO_OLD_PRICE}}<div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:20px;line-height:22px;color:#FFC2D2;text-decoration:line-through;padding-bottom:4px;">{{HERO_OLD_PRICE}}</div>{{/HERO_OLD_PRICE}}
  <div class="bigprice" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:90px;line-height:82px;color:#FFFFFF;letter-spacing:-1px;">{{HERO_PRICE}}</div>
</td></tr>

<!-- DEADLINE STRIP -->
<tr><td align="center" bgcolor="#0E0BD1" style="background-color:#0E0BD1;padding:16px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;">{{DEADLINE_TEXT}}</div>
</td></tr>

<!-- CTA -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:34px 24px 30px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px;">
      <a href="{{CTA_URL}}" target="_blank" style="display:inline-block;font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:#0B0018;padding:19px 52px;border-radius:6px;">Finish checkout →</a>
    </td>
  </tr></table>
</td></tr>

<!-- ADDITIONAL ITEMS (render only when more than one item) -->
{{#EXTRA_ITEMS}}
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:26px 28px 10px 28px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#B8ACCC;">Also in your cart</div>
</td></tr>
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:0 28px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <!-- REPEAT PER EXTRA ITEM -->
    <tr>
      <td width="66" style="padding:10px 0;"><a href="{{ITEM_URL}}" target="_blank"><img src="{{ITEM_IMAGE}}" width="56" alt="{{ITEM_NAME}}" style="width:56px;height:56px;border-radius:6px;"></a></td>
      <td style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;color:#E8E0F0;">{{ITEM_NAME}}</td>
      <td align="right" style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:16px;color:#FFFFFF;white-space:nowrap;">{{ITEM_PRICE}}</td>
    </tr>
    <!-- END REPEAT -->
  </table>
</td></tr>
{{/EXTRA_ITEMS}}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:30px 30px 40px 30px;border-top:1px solid #241243;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#B8ACCC;padding-bottom:10px;">THE PLUGIN WAREHOUSE</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-size:12px;line-height:19px;color:#8A7DA3;">
    You started a cart at thepluginwarehouse.com.<br>
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#B8ACCC;text-decoration:underline;">Stop these reminders</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

export const CART_2_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your cart's getting cold</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]><style>*{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  body{margin:0 !important;padding:0 !important;width:100% !important;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:44px !important;line-height:42px !important;}
    .bigprice{font-size:72px !important;line-height:66px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0B0018;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0B0018;opacity:0;">Still yours for now. Prices move, carts clear.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0018" style="background-color:#0B0018;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- LOGO BAR -->
<tr><td align="left" bgcolor="#0B0018" style="background-color:#0B0018;padding:22px 24px 20px 24px;border-bottom:1px solid #241243;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="150" alt="The Plugin Warehouse" style="width:150px;height:auto;">
</td></tr>

<!-- HEADLINE BLOCK -->
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:38px 32px 34px 32px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#FF003C;padding-bottom:12px;">Day two</div>
  <div class="h1" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:58px;line-height:54px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">Your cart's getting cold</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:500;font-size:17px;line-height:25px;color:#C9BEDD;padding-top:14px;">Still yours for now. Prices move, carts clear — this one's been sitting a while.</div>
</td></tr>

<!-- HERO IMAGE -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:0;">
  <a href="{{HERO_URL}}" target="_blank"><img src="{{HERO_IMAGE}}" width="600" alt="{{HERO_NAME}}" style="width:100%;max-width:600px;height:auto;"></a>
</td></tr>

<!-- NAME -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:26px 30px 16px 30px;">
  <div style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:26px;line-height:30px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">{{HERO_NAME}}</div>
</td></tr>

<!-- PRICE SLAB -->
<tr><td align="center" bgcolor="#FF003C" style="background-color:#FF003C;padding:24px 24px 26px 24px;">
  {{#HERO_OLD_PRICE}}<div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:20px;line-height:22px;color:#FFC2D2;text-decoration:line-through;padding-bottom:4px;">{{HERO_OLD_PRICE}}</div>{{/HERO_OLD_PRICE}}
  <div class="bigprice" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:90px;line-height:82px;color:#FFFFFF;letter-spacing:-1px;">{{HERO_PRICE}}</div>
</td></tr>

<!-- DEADLINE STRIP -->
<tr><td align="center" bgcolor="#0E0BD1" style="background-color:#0E0BD1;padding:16px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;">{{DEADLINE_TEXT}}</div>
</td></tr>

<!-- CTA -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:34px 24px 30px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px;">
      <a href="{{CTA_URL}}" target="_blank" style="display:inline-block;font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:#0B0018;padding:19px 52px;border-radius:6px;">Grab it before it's gone →</a>
    </td>
  </tr></table>
</td></tr>

<!-- ADDITIONAL ITEMS (render only when more than one item) -->
{{#EXTRA_ITEMS}}
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:26px 28px 10px 28px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#B8ACCC;">Also waiting</div>
</td></tr>
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:0 28px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <!-- REPEAT PER EXTRA ITEM -->
    <tr>
      <td width="66" style="padding:10px 0;"><a href="{{ITEM_URL}}" target="_blank"><img src="{{ITEM_IMAGE}}" width="56" alt="{{ITEM_NAME}}" style="width:56px;height:56px;border-radius:6px;"></a></td>
      <td style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;color:#E8E0F0;">{{ITEM_NAME}}</td>
      <td align="right" style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:16px;color:#FFFFFF;white-space:nowrap;">{{ITEM_PRICE}}</td>
    </tr>
    <!-- END REPEAT -->
  </table>
</td></tr>
{{/EXTRA_ITEMS}}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:30px 30px 40px 30px;border-top:1px solid #241243;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#B8ACCC;padding-bottom:10px;">THE PLUGIN WAREHOUSE</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-size:12px;line-height:19px;color:#8A7DA3;">
    You started a cart at thepluginwarehouse.com.<br>
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#B8ACCC;text-decoration:underline;">Stop these reminders</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

export const CART_3_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Last call</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]><style>*{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  body{margin:0 !important;padding:0 !important;width:100% !important;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:44px !important;line-height:42px !important;}
    .bigprice{font-size:72px !important;line-height:66px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0B0018;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0B0018;opacity:0;">Final reminder — after this, your cart clears.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0018" style="background-color:#0B0018;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- LOGO BAR -->
<tr><td align="left" bgcolor="#0B0018" style="background-color:#0B0018;padding:22px 24px 20px 24px;border-bottom:1px solid #241243;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="150" alt="The Plugin Warehouse" style="width:150px;height:auto;">
</td></tr>

<!-- HEADLINE BLOCK -->
<tr><td bgcolor="#FF003C" class="px" style="background-color:#FF003C;padding:38px 32px 34px 32px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#FFFFFF;padding-bottom:12px;">Final reminder</div>
  <div class="h1" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:58px;line-height:54px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">Last call</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:500;font-size:17px;line-height:25px;color:#FFEAF0;padding-top:14px;">This is the last time we'll mention it. After this, your cart clears and the price goes back to normal.</div>
</td></tr>

<!-- HERO IMAGE -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:0;">
  <a href="{{HERO_URL}}" target="_blank"><img src="{{HERO_IMAGE}}" width="600" alt="{{HERO_NAME}}" style="width:100%;max-width:600px;height:auto;"></a>
</td></tr>

<!-- NAME -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:26px 30px 16px 30px;">
  <div style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:26px;line-height:30px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">{{HERO_NAME}}</div>
</td></tr>

<!-- PRICE SLAB -->
<tr><td align="center" bgcolor="#FF003C" style="background-color:#FF003C;padding:24px 24px 26px 24px;">
  {{#HERO_OLD_PRICE}}<div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:20px;line-height:22px;color:#FFC2D2;text-decoration:line-through;padding-bottom:4px;">{{HERO_OLD_PRICE}}</div>{{/HERO_OLD_PRICE}}
  <div class="bigprice" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:90px;line-height:82px;color:#FFFFFF;letter-spacing:-1px;">{{HERO_PRICE}}</div>
</td></tr>

<!-- DEADLINE STRIP -->
<tr><td align="center" bgcolor="#0E0BD1" style="background-color:#0E0BD1;padding:16px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;">{{DEADLINE_TEXT}}</div>
</td></tr>

<!-- CTA -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:34px 24px 30px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px;">
      <a href="{{CTA_URL}}" target="_blank" style="display:inline-block;font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:#0B0018;padding:19px 52px;border-radius:6px;">Last chance →</a>
    </td>
  </tr></table>
</td></tr>

<!-- ADDITIONAL ITEMS (render only when more than one item) -->
{{#EXTRA_ITEMS}}
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:26px 28px 10px 28px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#B8ACCC;">Clearing with it</div>
</td></tr>
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:0 28px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <!-- REPEAT PER EXTRA ITEM -->
    <tr>
      <td width="66" style="padding:10px 0;"><a href="{{ITEM_URL}}" target="_blank"><img src="{{ITEM_IMAGE}}" width="56" alt="{{ITEM_NAME}}" style="width:56px;height:56px;border-radius:6px;"></a></td>
      <td style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;color:#E8E0F0;">{{ITEM_NAME}}</td>
      <td align="right" style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:16px;color:#FFFFFF;white-space:nowrap;">{{ITEM_PRICE}}</td>
    </tr>
    <!-- END REPEAT -->
  </table>
</td></tr>
{{/EXTRA_ITEMS}}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:30px 30px 40px 30px;border-top:1px solid #241243;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#B8ACCC;padding-bottom:10px;">THE PLUGIN WAREHOUSE</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-size:12px;line-height:19px;color:#8A7DA3;">
    This is the final reminder for this cart.<br>
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#B8ACCC;text-decoration:underline;">Stop these reminders</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

export const SAVED_1_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>You saved it for a reason</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]><style>*{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  body{margin:0 !important;padding:0 !important;width:100% !important;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:44px !important;line-height:42px !important;}
    .bigprice{font-size:72px !important;line-height:66px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0B0018;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0B0018;opacity:0;">It's still there. So is whatever made you want it.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0018" style="background-color:#0B0018;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- LOGO BAR -->
<tr><td align="left" bgcolor="#0B0018" style="background-color:#0B0018;padding:22px 24px 20px 24px;border-bottom:1px solid #241243;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="150" alt="The Plugin Warehouse" style="width:150px;height:auto;">
</td></tr>

<!-- HEADLINE BLOCK -->
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:38px 32px 34px 32px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#0E0BD1;padding-bottom:12px;">From your saved list</div>
  <div class="h1" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:58px;line-height:54px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">You saved it for a reason</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:500;font-size:17px;line-height:25px;color:#C9BEDD;padding-top:14px;">It's still sitting in your list. So is whatever made you want it in the first place.</div>
</td></tr>

<!-- HERO IMAGE -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:0;">
  <a href="{{HERO_URL}}" target="_blank"><img src="{{HERO_IMAGE}}" width="600" alt="{{HERO_NAME}}" style="width:100%;max-width:600px;height:auto;"></a>
</td></tr>

<!-- NAME -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:26px 30px 16px 30px;">
  <div style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:26px;line-height:30px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">{{HERO_NAME}}</div>
</td></tr>

<!-- PRICE SLAB -->
<tr><td align="center" bgcolor="#FF003C" style="background-color:#FF003C;padding:24px 24px 26px 24px;">
  {{#HERO_OLD_PRICE}}<div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:20px;line-height:22px;color:#FFC2D2;text-decoration:line-through;padding-bottom:4px;">{{HERO_OLD_PRICE}}</div>{{/HERO_OLD_PRICE}}
  <div class="bigprice" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:90px;line-height:82px;color:#FFFFFF;letter-spacing:-1px;">{{HERO_PRICE}}</div>
</td></tr>

<!-- DEADLINE STRIP -->
<tr><td align="center" bgcolor="#0E0BD1" style="background-color:#0E0BD1;padding:16px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;">{{DEADLINE_TEXT}}</div>
</td></tr>

<!-- CTA -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:34px 24px 30px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px;">
      <a href="{{CTA_URL}}" target="_blank" style="display:inline-block;font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:#0B0018;padding:19px 52px;border-radius:6px;">Take another look →</a>
    </td>
  </tr></table>
</td></tr>

<!-- ADDITIONAL ITEMS (render only when more than one item) -->
{{#EXTRA_ITEMS}}
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:26px 28px 10px 28px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#B8ACCC;">Also saved</div>
</td></tr>
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:0 28px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <!-- REPEAT PER EXTRA ITEM -->
    <tr>
      <td width="66" style="padding:10px 0;"><a href="{{ITEM_URL}}" target="_blank"><img src="{{ITEM_IMAGE}}" width="56" alt="{{ITEM_NAME}}" style="width:56px;height:56px;border-radius:6px;"></a></td>
      <td style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;color:#E8E0F0;">{{ITEM_NAME}}</td>
      <td align="right" style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:16px;color:#FFFFFF;white-space:nowrap;">{{ITEM_PRICE}}</td>
    </tr>
    <!-- END REPEAT -->
  </table>
</td></tr>
{{/EXTRA_ITEMS}}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:30px 30px 40px 30px;border-top:1px solid #241243;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#B8ACCC;padding-bottom:10px;">THE PLUGIN WAREHOUSE</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-size:12px;line-height:19px;color:#8A7DA3;">
    You saved this plugin at thepluginwarehouse.com.<br>
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#B8ACCC;text-decoration:underline;">Stop these reminders</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

export const PRICE_DROP_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>The price just dropped</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Dosis:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]><style>*{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;display:block;}
  body{margin:0 !important;padding:0 !important;width:100% !important;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:44px !important;line-height:42px !important;}
    .bigprice{font-size:76px !important;line-height:70px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0B0018;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0B0018;opacity:0;">{{HERO_NAME}} just dropped to {{HERO_NEW_PRICE}}. Was {{HERO_OLD_PRICE}}.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0018" style="background-color:#0B0018;">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- LOGO BAR -->
<tr><td align="left" bgcolor="#0B0018" style="background-color:#0B0018;padding:22px 24px 20px 24px;border-bottom:1px solid #241243;">
  <img src="https://thepluginwarehousefiles.com/covers/PWH%20Logo%20Main.png" width="150" alt="The Plugin Warehouse" style="width:150px;height:auto;">
</td></tr>

<!-- HEADLINE BLOCK -->
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:38px 32px 34px 32px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#FF003C;padding-bottom:12px;">Price Drop</div>
  <div class="h1" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:58px;line-height:54px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">It's cheaper now</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:500;font-size:17px;line-height:25px;color:#C9BEDD;padding-top:14px;">{{DROP_INTRO}}</div>
</td></tr>

<!-- HERO IMAGE -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:0;">
  <a href="{{HERO_URL}}" target="_blank"><img src="{{HERO_IMAGE}}" width="600" alt="{{HERO_NAME}}" style="width:100%;max-width:600px;height:auto;"></a>
</td></tr>

<!-- NAME -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:26px 30px 18px 30px;">
  <div style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:26px;line-height:30px;letter-spacing:0.5px;color:#FFFFFF;text-transform:uppercase;">{{HERO_NAME}}</div>
</td></tr>

<!-- PRICE SLAB -->
<tr><td align="center" bgcolor="#FF003C" style="background-color:#FF003C;padding:26px 24px 28px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:20px;line-height:22px;color:#FFC2D2;text-decoration:line-through;padding-bottom:4px;">{{HERO_OLD_PRICE}}</div>
  <div class="bigprice" style="font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:96px;line-height:86px;color:#FFFFFF;letter-spacing:-1px;">{{HERO_NEW_PRICE}}</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;padding-top:10px;">{{HERO_PERCENT_OFF}} off</div>
</td></tr>

<!-- DEADLINE STRIP -->
<tr><td align="center" bgcolor="#0E0BD1" style="background-color:#0E0BD1;padding:16px 24px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;">{{DEADLINE_TEXT}}</div>
</td></tr>

<!-- CTA -->
<tr><td align="center" bgcolor="#0B0018" style="background-color:#0B0018;padding:34px 24px 30px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px;">
      <a href="{{HERO_URL}}" target="_blank" style="display:inline-block;font-family:'Anton',Impact,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:#0B0018;padding:19px 52px;border-radius:6px;">Grab it now →</a>
    </td>
  </tr></table>
</td></tr>

<!-- ADDITIONAL ITEMS (render block only if more than one dropped) -->
{{#EXTRA_ITEMS}}
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:26px 28px 10px 28px;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#B8ACCC;">Also dropped</div>
</td></tr>
<tr><td bgcolor="#190737" class="px" style="background-color:#190737;padding:0 28px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <!-- REPEAT PER EXTRA ITEM -->
    <tr>
      <td width="66" style="padding:10px 0;"><a href="{{ITEM_URL}}" target="_blank"><img src="{{ITEM_IMAGE}}" width="56" alt="{{ITEM_NAME}}" style="width:56px;height:56px;border-radius:6px;"></a></td>
      <td style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;color:#E8E0F0;">{{ITEM_NAME}}</td>
      <td align="right" style="padding:10px 0;font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:16px;color:#FFFFFF;white-space:nowrap;"><span style="color:#B8ACCC;text-decoration:line-through;font-size:13px;">{{ITEM_OLD_PRICE}}</span>&nbsp; {{ITEM_NEW_PRICE}}</td>
    </tr>
    <!-- END REPEAT -->
  </table>
</td></tr>
{{/EXTRA_ITEMS}}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#0B0018" class="px" style="background-color:#0B0018;padding:30px 30px 40px 30px;border-top:1px solid #241243;">
  <div style="font-family:'Dosis',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#B8ACCC;padding-bottom:10px;">THE PLUGIN WAREHOUSE</div>
  <div style="font-family:'Dosis',Arial,sans-serif;font-size:12px;line-height:19px;color:#8A7DA3;">
    You saved this plugin at thepluginwarehouse.com.<br>
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#B8ACCC;text-decoration:underline;">Stop these reminders</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
