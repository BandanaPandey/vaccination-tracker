require "test_helper"

class ReminderRunnerTest < ActiveSupport::TestCase
  test "sends email and sms reminders logs deliveries and prevents duplicates" do
    user = User.create!(name: "Runner User", email: "runner@example.com", phone_number: "+15555550123", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    user.reminder_preference_or_default.update!(email_enabled: true, sms_enabled: true, lead_days: 10, overdue_enabled: true)
    profile.vaccination_records.create!(vaccine_name: "BCG", date_administered: Date.new(2025, 1, 1), dose_number: 1)

    generated_at = Time.zone.parse("2025-03-10 09:00:00")

    result = ReminderRunner.call(user, reference_date: Date.new(2025, 3, 10), generated_at: generated_at)

    assert result[:sent] > 0
    assert_equal result[:sent], user.reminder_deliveries.count
    assert_equal user.reminder_deliveries.where(channel: "email").count, ActionMailer::Base.deliveries.count
    assert_equal user.reminder_deliveries.where(channel: "sms").count, Sms::TestAdapter.deliveries.count

    second_result = ReminderRunner.call(user, reference_date: Date.new(2025, 3, 10), generated_at: generated_at + 2.hours)

    assert_equal 0, second_result[:sent]
    assert second_result[:skipped] > 0
  end

  test "skips sms when phone number is missing" do
    user = User.create!(name: "No Phone", email: "runner-no-phone@example.com", password: "password123", password_confirmation: "password123")
    user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "US", date_of_birth: Date.new(2025, 1, 1))
    user.reminder_preference_or_default.update!(email_enabled: false, sms_enabled: true, lead_days: 60, overdue_enabled: true)

    result = ReminderRunner.call(user, reference_date: Date.new(2025, 2, 20), generated_at: Time.zone.parse("2025-02-20 09:00:00"))

    assert_equal 0, result[:attempted]
    assert_empty Sms::TestAdapter.deliveries
  end
end
