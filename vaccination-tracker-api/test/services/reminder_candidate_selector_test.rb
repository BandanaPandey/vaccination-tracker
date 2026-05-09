require "test_helper"

class ReminderCandidateSelectorTest < ActiveSupport::TestCase
  test "selects upcoming and overdue items using account reminder preferences" do
    user = User.create!(name: "Selector User", email: "selector@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    preference = user.reminder_preference_or_default
    preference.update!(lead_days: 10, overdue_enabled: true)

    candidates = ReminderCandidateSelector.call(user, reminder_preference: preference, reference_date: Date.new(2025, 3, 10), generated_at: Time.zone.parse("2025-03-10 09:00:00"))

    assert candidates.any? { |candidate| candidate[:kind] == "overdue" }
    assert candidates.any? { |candidate| candidate[:kind] == "upcoming" }
    assert_equal ["overdue", "overdue", "overdue"], candidates.first(3).map { |candidate| candidate[:kind] }
    assert_equal "Aarav", candidates.first[:profile_name]
  end

  test "skips profiles without date of birth" do
    user = User.create!(name: "No Dob", email: "selector-no-dob@example.com", password: "password123", password_confirmation: "password123")
    user.profiles.create!(name: "Self", relationship_kind: "self", schedule_region: "US")

    candidates = ReminderCandidateSelector.call(user, reference_date: Date.current, generated_at: Time.current)

    assert_empty candidates
  end
end
