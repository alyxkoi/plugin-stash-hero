// Behavioral email HTML, verbatim from the supplied Resend templates.
// Do not hand-edit; regenerate from the source HTML instead.

export const CART_1_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Still in your cart</title>
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
Nothing expired. Nothing sold out. It is exactly where you left it.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
    STILL IN<br>YOUR CART.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">An hour ago you were one click from the sound you have been chasing. Nothing expired and nothing sold out. But every price in your cart is a sale price, and sale prices are the first thing to go.</div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{CART_TOTAL}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">&#8595; {{CART_SAVINGS_PCT}}</span>
        </td>
      </tr></table>
    </td>
  </tr></table>

  <div style="padding-top:12px;"><div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; font-weight:600;">CART TOTAL</div></div>
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="{{CART_URL}}"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional cart item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="{{CART_URL}}"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:18px; font-weight:700; color:#8E86B4;">{{ITEM_PRICE}}</span><br>
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:12px; font-weight:400; color:#5B5478; text-decoration:line-through;">{{ITEM_ORIGINAL}}</span>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="{{CART_URL}}" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">FINISH CHECKOUT &#8594;</a>
        </td>
      </tr></table>
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
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">There are hundreds more<br>in the vault.</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Most of them sit under twenty five dollars, and none of those prices are the normal ones.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/shop" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">BROWSE THE VAULT &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
</td>
</tr>
<tr>
<td class="gut" style="padding:26px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:12px; line-height:18px; color:#FFFFFF; letter-spacing:2px; font-weight:700;">PLUGIN WAREHOUSE</div>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#C9C2E4; padding-top:12px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#C9C2E4; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#C9C2E4; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#C9C2E4; text-decoration:underline;">Stop cart reminders</a>
  </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:14px;">That link only stops cart and saved item emails. Your newsletter stays put.</div>
</td>
</tr>
<tr><td height="48" style="height:48px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

export const CART_2_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>One day later</title>
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
Your cart has not moved. Neither have the prices.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
    ONE DAY<br>LATER.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">The track in your head and the track coming out of your speakers are usually one plugin apart. That gap is what has been sitting in your cart since yesterday, and right now it costs a fraction of what it is worth.</div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; font-weight:600;">YOU ARE SAVING</div><div style="height:10px; font-size:0; line-height:0;">&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{CART_SAVINGS_AMOUNT}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">{{CART_TOTAL}} TO PAY</span>
        </td>
      </tr></table>
    </td>
  </tr></table>
  <div class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:17px; color:#6E6690; text-decoration:line-through; padding-top:10px;">Normally {{CART_ORIGINAL_TOTAL}}</div>
  
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="{{CART_URL}}"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional cart item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="{{CART_URL}}"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:18px; font-weight:700; color:#8E86B4;">{{ITEM_PRICE}}</span><br>
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:12px; font-weight:400; color:#5B5478; text-decoration:line-through;">{{ITEM_ORIGINAL}}</span>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="{{CART_URL}}" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">PICK IT BACK UP &#8594;</a>
        </td>
      </tr></table>
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
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">There are hundreds more<br>in the vault.</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Most of them sit under twenty five dollars, and none of those prices are the normal ones.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/shop" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">BROWSE THE VAULT &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
</td>
</tr>
<tr>
<td class="gut" style="padding:26px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:12px; line-height:18px; color:#FFFFFF; letter-spacing:2px; font-weight:700;">PLUGIN WAREHOUSE</div>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#C9C2E4; padding-top:12px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#C9C2E4; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#C9C2E4; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#C9C2E4; text-decoration:underline;">Stop cart reminders</a>
  </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:14px;">That link only stops cart and saved item emails. Your newsletter stays put.</div>
</td>
</tr>
<tr><td height="48" style="height:48px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

export const CART_3_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Last one from us</title>
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
Three days of nudging is enough. Your cart stays saved either way.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
    LAST ONE<br>FROM US.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">Three days of nudging is enough, so this is the last one. Your cart stays saved. The pricing does not. Everything in there is marked down right now, and markdowns get pulled without warning. The best record you have made is probably still ahead of you. Some of it is sitting in this cart.</div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{CART_SAVINGS_PCT}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">{{CART_TOTAL}} TO PAY</span>
        </td>
      </tr></table>
    </td>
  </tr></table>

  <div style="padding-top:12px;"><div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; font-weight:600;">OFF RETAIL</div></div>
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="{{CART_URL}}"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional cart item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="{{CART_URL}}"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:18px; font-weight:700; color:#8E86B4;">{{ITEM_PRICE}}</span><br>
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:12px; font-weight:400; color:#5B5478; text-decoration:line-through;">{{ITEM_ORIGINAL}}</span>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="{{CART_URL}}" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">CHECK OUT NOW &#8594;</a>
        </td>
      </tr></table>
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
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">There are hundreds more<br>in the vault.</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Most of them sit under twenty five dollars, and none of those prices are the normal ones.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/shop" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">BROWSE THE VAULT &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
</td>
</tr>
<tr>
<td class="gut" style="padding:26px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:12px; line-height:18px; color:#FFFFFF; letter-spacing:2px; font-weight:700;">PLUGIN WAREHOUSE</div>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#C9C2E4; padding-top:12px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#C9C2E4; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#C9C2E4; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#C9C2E4; text-decoration:underline;">Stop cart reminders</a>
  </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:14px;">That link only stops cart and saved item emails. Your newsletter stays put.</div>
</td>
</tr>
<tr><td height="48" style="height:48px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

export const SAVED_1_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Still on your list</title>
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
Same item, same price, still sitting in your saved list.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
    STILL ON<br>YOUR LIST.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">You saved this because something about it clicked. It is still sitting on your list, still cut down from {{SAVED_ORIGINAL}}, and still doing absolutely nothing for your tracks while it waits there.</div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; font-weight:600;">DOWN FROM {{SAVED_ORIGINAL}}</div><div style="height:10px; font-size:0; line-height:0;">&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{SAVED_PRICE}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">&#8595; {{SAVED_SAVINGS_PCT}} OFF RETAIL</span>
        </td>
      </tr></table>
    </td>
  </tr></table>

  
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="https://www.thepluginwarehouse.com/account/saved"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional saved item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="https://www.thepluginwarehouse.com/account/saved"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:18px; font-weight:700; color:#8E86B4;">{{ITEM_PRICE}}</span><br>
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:12px; font-weight:400; color:#5B5478; text-decoration:line-through;">{{ITEM_ORIGINAL}}</span>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/account/saved" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">VIEW YOUR SAVED LIST &#8594;</a>
        </td>
      </tr></table>
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
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">There are hundreds more<br>in the vault.</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Most of them sit under twenty five dollars, and none of those prices are the normal ones.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/shop" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">BROWSE THE VAULT &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
</td>
</tr>
<tr>
<td class="gut" style="padding:26px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:12px; line-height:18px; color:#FFFFFF; letter-spacing:2px; font-weight:700;">PLUGIN WAREHOUSE</div>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#C9C2E4; padding-top:12px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#C9C2E4; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#C9C2E4; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#C9C2E4; text-decoration:underline;">Stop saved item alerts</a>
  </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:14px;">That link only stops cart and saved item emails. Your newsletter stays put.</div>
</td>
</tr>
<tr><td height="48" style="height:48px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

export const SAVED_2_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Still waiting on you</title>
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
It retails for {{SAVED_ORIGINAL}}. You can have it for {{SAVED_PRICE}}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
    STILL WAITING<br>ON YOU.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
    <td width="72" height="5" bgcolor="#FA1265" style="width:72px; height:5px; background-color:#FA1265; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:16px; line-height:25px; color:#C9C2E4; padding-top:20px;">Five days on your list and nothing has changed except the amount of music you have not made with it. It retails for {{SAVED_ORIGINAL}}. You can have it for {{SAVED_PRICE}}. That gap is the entire reason this store exists, and it is not a gap that stays open forever.</div>
</td>
</tr>

<tr>
<td class="gut" style="padding:40px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:11px; line-height:16px; color:#8E86B4; letter-spacing:1.6px; font-weight:600;">RETAILS FOR {{SAVED_ORIGINAL}}</div><div style="height:10px; font-size:0; line-height:0;">&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom" style="padding:0;">
      <div class="code fig" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:94px; line-height:86px; font-weight:700; color:#FFFFFF; letter-spacing:-4px;">{{SAVED_PRICE}}</div>
    </td>
    <td valign="bottom" style="padding:0 0 16px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#7DF5AD" style="background-color:#7DF5AD; border-radius:8px; padding:8px 12px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:14px; font-weight:700; color:#04021E; letter-spacing:0.4px;">&#8595; {{SAVED_SAVINGS_PCT}} OFF</span>
        </td>
      </tr></table>
    </td>
  </tr></table>

  
</td>
</tr>
<tr><td height="42" style="height:42px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0D0C13" style="background-color:#0D0C13; border-radius:20px;">

    <tr>
    <td class="pad" style="padding:22px 22px 0 22px;">
      <a href="https://www.thepluginwarehouse.com/account/saved"><img src="{{HERO_IMAGE}}" width="508" alt="{{HERO_NAME}}" class="heroimg" style="width:508px; max-width:100%; height:auto; display:block; border-radius:12px 12px 0 0;"></a>
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
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#4B3FE8" style="background-color:#4B3FE8; border-radius:9px; padding:11px 16px;">
          <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:13px; font-weight:700; color:#FFFFFF; letter-spacing:0.6px;">{{DEADLINE_TEXT}}</span>
        </td>
      </tr></table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- {{EXTRA_ITEMS}} repeat this row per additional saved item -->
        <tr>
          <td width="76" valign="middle" style="padding:16px 0;">
            <a href="https://www.thepluginwarehouse.com/account/saved"><img src="{{ITEM_IMAGE}}" width="64" height="64" alt="{{ITEM_NAME}}" style="width:64px; height:64px; border-radius:10px; display:block;"></a>
          </td>
          <td valign="middle" style="padding:16px 12px 16px 0;">
            <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 60,'wdth' 95; font-size:16px; line-height:21px; font-weight:700; color:#FFFFFF;">{{ITEM_NAME}}</div>
          </td>
          <td valign="middle" align="right" style="padding:16px 0; white-space:nowrap;">
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:18px; font-weight:700; color:#8E86B4;">{{ITEM_PRICE}}</span><br>
            <span class="code" style="font-family:'Google Sans Code','SF Mono',Consolas,'Courier New',monospace; font-size:12px; font-weight:400; color:#5B5478; text-decoration:line-through;">{{ITEM_ORIGINAL}}</span>
          </td>
        </tr>
        <tr><td colspan="3" height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td></tr>
        <!-- end repeat -->
      </table>
    </td>
    </tr>

    <tr>
    <td class="pad" style="padding:28px 30px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#FA1265" style="background-color:#FA1265; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/account/saved" style="display:block; padding:20px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:17px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">CLAIM IT AT {{SAVED_PRICE}} &#8594;</a>
        </td>
      </tr></table>
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
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:24px; line-height:30px; font-weight:800; color:#FFFFFF;">There are hundreds more<br>in the vault.</div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:15px; line-height:23px; color:#E4DEF2; padding-top:10px;">Most of them sit under twenty five dollars, and none of those prices are the normal ones.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
        <td bgcolor="#2E2750" style="background-color:#2E2750; border:2px solid #FFFFFF; border-radius:12px;">
          <a href="https://www.thepluginwarehouse.com/shop" style="display:block; padding:14px 24px; font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 100,'wdth' 95; font-size:14px; font-weight:800; color:#FFFFFF; letter-spacing:0.6px;">BROWSE THE VAULT &#8594;</a>
        </td>
      </tr></table>
    </td>
    </tr>
  </table>
</td>
</tr>
<tr><td height="46" style="height:46px; font-size:0; line-height:0;">&nbsp;</td></tr>

<tr>
<td class="gut" style="padding:0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td height="1" bgcolor="#26223A" style="height:1px; background-color:#26223A; font-size:0; line-height:0;">&nbsp;</td>
  </tr></table>
</td>
</tr>
<tr>
<td class="gut" style="padding:26px 24px 0 24px;">
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 25,'wdth' 92; font-size:12px; line-height:18px; color:#FFFFFF; letter-spacing:2px; font-weight:700;">PLUGIN WAREHOUSE</div>
  <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:13px; line-height:22px; color:#C9C2E4; padding-top:12px;">
        <a href="https://www.thepluginwarehouse.com/contact-us" style="color:#C9C2E4; text-decoration:underline;">Contact</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://www.thepluginwarehouse.com/shop" style="color:#C9C2E4; text-decoration:underline;">Shop all</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#C9C2E4; text-decoration:underline;">Stop saved item alerts</a>
  </div>
      <div style="font-family:'Google Sans Flex',Verdana,Geneva,Tahoma,sans-serif; font-variation-settings:'ROND' 40; font-size:12px; line-height:18px; color:#6E6690; padding-top:14px;">That link only stops cart and saved item emails. Your newsletter stays put.</div>
</td>
</tr>
<tr><td height="48" style="height:48px; font-size:0; line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
