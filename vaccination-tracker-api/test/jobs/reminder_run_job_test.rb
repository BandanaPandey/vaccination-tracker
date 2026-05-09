require "test_helper"

class ReminderRunJobTest < ActiveJob::TestCase
  test "creates reminder deliveries for a specific user" do
    user = User.create!(name: "Job User", email: "job@example.com", phone_number: "+15555550199", password: "password123", password_confirmation: "password123")
    user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "US", date_of_birth: Date.new(2025, 1, 1))
    user.reminder_preference_or_default.update!(email_enabled: true, sms_enabled: false, lead_days: 60, overdue_enabled: true)

    travel_to Time.zone.parse("2025-02-20 09:00:00") do
      ReminderRunJob.perform_now(user.id)
    end

    assert user.reminder_deliveries.count.positive?
  end
end
