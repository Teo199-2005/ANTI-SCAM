<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $title }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  @if(!empty($preheader))
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      {{ $preheader }}
    </div>
  @endif
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 14px 24px;border-bottom:1px solid #e2e8f0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    @if(!empty($logoUrl))
                      <img src="{{ $logoUrl }}" data-brand-logo="1" alt="{{ $brandName }}" width="190" height="42" style="height:42px;max-width:190px;width:auto;object-fit:contain;display:block;border:0;">
                    @else
                      <div style="font-size:21px;font-weight:700;color:#0f172a;letter-spacing:0.2px;">{{ $brandName }}</div>
                    @endif
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              {!! $contentHtml !!}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:18px;color:#475569;">
                {{ $trademarkLine }}
              </p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">
                Support: <a href="mailto:{{ $supportEmail }}" style="color:#1d4ed8;text-decoration:none;">{{ $supportEmail }}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

