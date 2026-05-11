class ApplicationMailer < ActionMailer::Base
  default from: -> { ENV.fetch("SMTP_FROM_EMAIL", "no-reply@vaccination-tracker.local") }
  layout "mailer"
end
