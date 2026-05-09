require "test_helper"

class ReminderMailerTest < ActionMailer::TestCase
  test "renders vaccine reminder email" do
    user = User.create!(name: "Mailer User", email: "mailer@example.com", password: "password123", password_confirmation: "password123")
    candidate = {
      profile_name: "Aarav",
      vaccine_name: "MMR",
      dose_label: "Dose 1",
      kind: "upcoming",
      due_date: Date.new(2025, 10, 1),
      schedule_region: "IN"
    }

    email = ReminderMailer.with(user:, candidate:).vaccine_reminder

    assert_equal ["mailer@example.com"], email.to
    assert_includes email.subject, "MMR"
    assert_includes email.body.encoded, "Aarav"
    assert_includes email.body.encoded, "upcoming"
  end
end
