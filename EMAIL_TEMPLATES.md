# Coheren.ai Email Templates for Supabase

## How to Apply These Templates

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/icxbgtizbdosturlxdxd/auth/templates)
2. Click **Authentication** → **Email Templates**
3. Choose template type (Confirm signup, Magic Link, etc.)
4. Replace default HTML with the templates below
5. Click **Save**

---

## 1. Confirm Signup Email

**Use for:** Email verification when users sign up

**Location in Supabase:** Email Templates → Confirm signup

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Coheren.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 300; color: #ffffff; letter-spacing: -0.02em;">
                coheren.ai
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 300;">
                Your AI-Powered Goal Coach
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #1f2937;">
                Welcome to Coheren! 🎉
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                We're excited to have you on board! You're just one click away from turning your goals into reality with AI-powered guidance.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                To complete your registration and start building your personalized roadmap, please confirm your email address:
              </p>

              <!-- Confirm Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #6366F1; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                      Confirm Your Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #6366F1; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                {{ .ConfirmationURL }}
              </p>

              <!-- What's Next -->
              <div style="background-color: #FFF8F0; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #92400E;">
                  ✨ What's Next?
                </h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350F;">
                  After confirming your email, you'll chat with our AI to understand your goal, and we'll generate a personalized 90-day roadmap with daily tasks tailored just for you.
                </p>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you didn't create an account with Coheren.ai, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; text-align: center; color: #6b7280;">
                Made with ❤️ by the Coheren.ai team
              </p>
              <p style="margin: 0; font-size: 12px; text-align: center; color: #9ca3af;">
                © 2024 Coheren.ai - Turn goals into reality
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link Email

**Use for:** Passwordless login

**Location in Supabase:** Email Templates → Magic Link

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Coheren.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 300; color: #ffffff; letter-spacing: -0.02em;">
                coheren.ai
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #1f2937;">
                Your Sign-In Link 🔐
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Click the button below to sign in to your Coheren.ai account:
              </p>

              <!-- Sign In Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #6366F1; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                      Sign In to Coheren.ai
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this link:
              </p>

              <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #6366F1; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                {{ .ConfirmationURL }}
              </p>

              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991B1B;">
                  <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request this sign-in link, please ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; text-align: center; color: #9ca3af;">
                © 2024 Coheren.ai - Turn goals into reality
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Password Reset Email

**Use for:** When users request password reset

**Location in Supabase:** Email Templates → Reset Password

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Coheren.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 300; color: #ffffff; letter-spacing: -0.02em;">
                coheren.ai
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #1f2937;">
                Reset Your Password 🔑
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                We received a request to reset your password for your Coheren.ai account. Click the button below to create a new password:
              </p>

              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #6366F1; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this link:
              </p>

              <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #6366F1; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                {{ .ConfirmationURL }}
              </p>

              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991B1B;">
                  <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; text-align: center; color: #9ca3af;">
                © 2024 Coheren.ai - Turn goals into reality
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Email Change Confirmation

**Use for:** When users change their email

**Location in Supabase:** Email Templates → Change Email Address

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change - Coheren.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 300; color: #ffffff; letter-spacing: -0.02em;">
                coheren.ai
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #1f2937;">
                Confirm Email Change 📧
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                You've requested to change the email address for your Coheren.ai account. Click the button below to confirm this change:
              </p>

              <!-- Confirm Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 32px; background-color: #6366F1; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                      Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Or copy and paste this link:
              </p>

              <p style="margin: 0 0 30px; font-size: 13px; line-height: 1.6; color: #6366F1; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 6px;">
                {{ .ConfirmationURL }}
              </p>

              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991B1B;">
                  <strong>Security Notice:</strong> If you didn't request this email change, please contact support immediately and change your password.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; text-align: center; color: #9ca3af;">
                © 2024 Coheren.ai - Turn goals into reality
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## How to Apply Templates

### Step 1: Go to Email Templates
```
https://supabase.com/dashboard/project/icxbgtizbdosturlxdxd/auth/templates
```

### Step 2: For Each Template Type

1. Click on template name (e.g., "Confirm signup")
2. Scroll down to **Message (HTML)**
3. Delete existing template
4. Copy & paste the HTML from above
5. Click **Save**

### Step 3: Test Email

1. Sign up with a new test email
2. Check your inbox
3. Should see branded Coheren.ai email! 🎉

---

## Template Variables

Supabase provides these variables you can use:

- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL
- `{{ .Token }}` - The confirmation token

---

## Preview

Your emails will have:
- ✅ Gradient header with "coheren.ai" branding
- ✅ Professional typography
- ✅ Clear call-to-action buttons
- ✅ Security notices
- ✅ Mobile responsive design
- ✅ Copy-paste link fallback

---

## Customization Tips

Want to add your logo image?

1. Upload logo to a public URL (Imgur, Cloudinary, etc.)
2. Add this in the header `<td>`:

```html
<img src="YOUR_LOGO_URL" alt="Coheren.ai" style="width: 120px; height: auto; margin-bottom: 10px;">
```

---

**All templates are ready to copy-paste into Supabase!** 🎨
