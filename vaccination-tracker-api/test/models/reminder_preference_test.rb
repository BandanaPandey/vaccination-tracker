require "test_helper"

class ReminderPreferenceTest < ActiveSupport::TestCase
  test "validates lead days range" do
    user = User.create!(name: "Prefs User", email: "prefs-model@example.com", password: "password123", password_confirmation: "password123")
    preference = user.reminder_preference_or_default

    preference.lead_days = -1

    assert_not preference.valid?
    assert_includes preference.errors[:lead_days], "must be greater than or equal to 0"
  end
end
