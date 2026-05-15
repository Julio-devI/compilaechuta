from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from app.core.config import settings

_fast_mail: FastMail | None = None


def _get_fast_mail() -> FastMail:
    global _fast_mail
    if _fast_mail is None:
        if not settings.MAIL_FROM:
            raise RuntimeError(
                "Email não configurado. Defina MAIL_FROM (e demais variáveis MAIL_*) no arquivo .env."
            )
        config = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        _fast_mail = FastMail(config)
    return _fast_mail


async def send_reset_password_email(email: str, nome: str, token: str) -> None:
    reset_link = f"{settings.FRONTEND_URL}/redefinir-senha?token={token}"
    primeiro_nome = nome.split()[0].capitalize()

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4FF;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4FF;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- card -->
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border-radius:16px;
                      box-shadow:0 4px 24px rgba(21,101,192,0.10);overflow:hidden;">

          <!-- header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1172 0%,#1565C0 60%,#1E88E5 100%);
                        padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:3px;
                         color:rgba(255,255,255,0.65);text-transform:uppercase;">
                V-Commerce CRM 360
              </p>
              <!-- lock icon -->
              <div style="display:inline-block;background:rgba(255,255,255,0.15);
                           border-radius:50%;width:64px;height:64px;line-height:64px;
                           text-align:center;margin-bottom:16px;">
                <span style="font-size:28px;">🔒</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;
                          letter-spacing:-0.3px;">
                Redefinição de senha
              </h1>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 8px;font-size:16px;color:#1A237E;font-weight:600;">
                Olá, {primeiro_nome}!
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#37474F;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no
                <strong style="color:#1565C0;">V-Commerce CRM 360</strong>.
                Se foi você, clique no botão abaixo.
              </p>

              <!-- aviso de expiração -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#EFF6FF;border-left:4px solid #1565C0;
                             border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#1565C0;font-weight:500;">
                    ⏱ Este link expira em <strong>15 minutos</strong>.
                  </td>
                </tr>
              </table>

              <!-- botão -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="{reset_link}"
                       style="display:inline-block;background:linear-gradient(135deg,#1565C0,#1E88E5);
                               color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;
                               padding:14px 40px;border-radius:50px;
                               box-shadow:0 4px 12px rgba(21,101,192,0.35);
                               letter-spacing:0.2px;">
                      Redefinir senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- link alternativo -->
              <p style="margin:0 0 4px;font-size:12px;color:#90A4AE;text-align:center;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="margin:0 0 28px;font-size:11px;color:#1565C0;text-align:center;
                          word-break:break-all;">
                {reset_link}
              </p>

              <hr style="border:none;border-top:1px solid #EEF2FF;margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#90A4AE;line-height:1.6;">
                Se você <strong>não solicitou</strong> a redefinição, ignore este email —
                sua senha permanece a mesma e nenhuma alteração será feita.
              </p>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="background:#F8FAFF;padding:20px 40px;text-align:center;
                        border-top:1px solid #EEF2FF;">
              <p style="margin:0;font-size:11px;color:#B0BEC5;">
                © 2025 V-Commerce CRM 360 &nbsp;·&nbsp; Este é um email automático, não responda.
              </p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>
  <!-- /wrapper -->

</body>
</html>"""

    message = MessageSchema(
        subject="Redefinição de senha — V-Commerce CRM 360",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )

    await _get_fast_mail().send_message(message)
