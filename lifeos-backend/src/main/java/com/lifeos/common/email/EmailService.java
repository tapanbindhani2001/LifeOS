package com.lifeos.common.email;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:localhost}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendResetPasswordOtp(String toEmail, String fullName, String otpCode) {
        log.info("Initiating password reset OTP flow for: {} ({})", toEmail, fullName);
        
        String subject = "LifeOS - Reset Your Password";
        
        // Premium HTML Email Template
        String htmlBody = "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset=\"utf-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>Reset Your Password</title>\n" +
                "    <style>\n" +
                "        body {\n" +
                "            font-family: 'Inter', -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n" +
                "            background-color: #f7f7fb;\n" +
                "            color: #1a1826;\n" +
                "            margin: 0;\n" +
                "            padding: 0;\n" +
                "            -webkit-font-smoothing: antialiased;\n" +
                "        }\n" +
                "        .container {\n" +
                "            max-width: 560px;\n" +
                "            margin: 30px auto;\n" +
                "            background: #ffffff;\n" +
                "            border: 1px solid #e2e1ee;\n" +
                "            border-radius: 16px;\n" +
                "            overflow: hidden;\n" +
                "            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);\n" +
                "        }\n" +
                "        .header {\n" +
                "            background: linear-gradient(135deg, #8b5cf6 0%, #6d4df2 50%, #3b82f6 100%);\n" +
                "            padding: 32px;\n" +
                "            text-align: center;\n" +
                "        }\n" +
                "        .logo-text {\n" +
                "            color: #ffffff;\n" +
                "            font-size: 24px;\n" +
                "            font-weight: 800;\n" +
                "            letter-spacing: -0.5px;\n" +
                "            margin: 0;\n" +
                "        }\n" +
                "        .content {\n" +
                "            padding: 40px;\n" +
                "        }\n" +
                "        h1 {\n" +
                "            font-size: 20px;\n" +
                "            font-weight: 700;\n" +
                "            color: #1a1826;\n" +
                "            margin-top: 0;\n" +
                "            margin-bottom: 16px;\n" +
                "        }\n" +
                "        p {\n" +
                "            font-size: 15px;\n" +
                "            line-height: 24px;\n" +
                "            color: #6b6885;\n" +
                "            margin: 0 0 24px 0;\n" +
                "        }\n" +
                "        .code-container {\n" +
                "            background-color: #f3f0ff;\n" +
                "            border: 1px dashed #a78bfa;\n" +
                "            border-radius: 12px;\n" +
                "            padding: 20px;\n" +
                "            text-align: center;\n" +
                "            margin: 28px 0;\n" +
                "        }\n" +
                "        .code {\n" +
                "            font-family: 'Courier New', Courier, monospace;\n" +
                "            font-size: 36px;\n" +
                "            font-weight: 800;\n" +
                "            letter-spacing: 6px;\n" +
                "            color: #6d4df2;\n" +
                "            margin: 0;\n" +
                "        }\n" +
                "        .footer {\n" +
                "            padding: 0 40px 40px 40px;\n" +
                "            border-top: 1px solid #ededf5;\n" +
                "            font-size: 12px;\n" +
                "            color: #a3a1b5;\n" +
                "            line-height: 18px;\n" +
                "        }\n" +
                "        .footer-logo {\n" +
                "            font-weight: 700;\n" +
                "            color: #6b6885;\n" +
                "            margin-bottom: 4px;\n" +
                "        }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <div class=\"header\">\n" +
                "            <h2 class=\"logo-text\">LifeOS</h2>\n" +
                "        </div>\n" +
                "        <div class=\"content\">\n" +
                "            <h1>Reset your password</h1>\n" +
                "            <p>Hello <strong>" + fullName + "</strong>,</p>\n" +
                "            <p>We received a request to reset your password for your LifeOS account. Use the verification code below to proceed. This code is valid for <strong>5 minutes</strong>.</p>\n" +
                "            \n" +
                "            <div class=\"code-container\">\n" +
                "                <div class=\"code\">" + otpCode + "</div>\n" +
                "            </div>\n" +
                "            \n" +
                "            <p>If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>\n" +
                "            <p>Best regards,<br>The LifeOS Team</p>\n" +
                "        </div>\n" +
                "        <div class=\"footer\">\n" +
                "            <div class=\"footer-logo\">LifeOS</div>\n" +
                "            <p style=\"font-size: 11px; margin: 0;\">This is an automated security message. Please do not reply directly to this email.</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";

        // Plain text fallback
        String plainTextBody = "Hello " + fullName + ",\n\n" +
                "You requested a password reset for your LifeOS account. " +
                "Please use the following 6-digit Verification Code to complete the reset. " +
                "This code is valid for 5 minutes.\n\n" +
                "Verification Code: " + otpCode + "\n\n" +
                "If you did not request this, please ignore this email.\n\n" +
                "Best regards,\n" +
                "The LifeOS Team";

        // Sandbox / dry-run fallback
        if ("localhost".equals(mailHost) || mailUsername.isEmpty()) {
            log.warn("SMTP settings not configured. Operating in SANDBOX/DRY-RUN mode.");
            log.info("\n==================== [SANDBOX EMAIL DRY RUN] ====================\n" +
                     "To: {}\n" +
                     "Subject: {}\n" +
                     "Body:\n{}\n" +
                     "=================================================================", 
                     toEmail, subject, plainTextBody);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(plainTextBody, htmlBody); // Sets both plain text and HTML
            helper.setFrom(mailUsername);
            
            log.debug("Attempting to send HTML email via SMTP host: {}", mailHost);
            mailSender.send(message);
            log.info("Successfully sent password reset email to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email via SMTP to: {} due to error: {}", toEmail, e.getMessage(), e);
            log.warn("\n==================== [FALLBACK EMAIL LOG] ====================\n" +
                     "To: {}\n" +
                     "Subject: {}\n" +
                     "Body:\n{}\n" +
                     "==============================================================", 
                     toEmail, subject, plainTextBody);
        }
    }
}
