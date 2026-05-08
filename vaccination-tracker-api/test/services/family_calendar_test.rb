require "test_helper"

class FamilyCalendarTest < ActiveSupport::TestCase
  test "buckets schedule items into the requested month" do
    user = User.create!(name: "Bandana Pandey", email: "family-calendar@example.com", password: "password123", password_confirmation: "password123")
    user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    user.profiles.create!(name: "Maya", relationship_kind: "child", schedule_region: "US", date_of_birth: Date.new(2025, 1, 1))

    payload = FamilyCalendar.call(user, month: "2025-03", reference_date: Date.new(2025, 3, 10), generated_at: Time.zone.parse("2025-03-10 09:00:00"))

    assert_equal "2025-03", payload[:month]
    march_day = payload[:days].find { |day| day[:date] == "2025-03-12" }
    assert_not_nil march_day
    assert_equal "Aarav", march_day[:items].first[:profile_name]
    assert_equal "OPV", march_day[:items].first[:vaccine_name]
  end

  test "falls back to the current month when the month parameter is invalid" do
    user = User.create!(name: "Bandana Pandey", email: "family-calendar-invalid@example.com", password: "password123", password_confirmation: "password123")

    payload = FamilyCalendar.call(user, month: "not-a-month", reference_date: Date.new(2025, 5, 10))

    assert_equal "2025-05", payload[:month]
    assert_equal 31, payload[:days].length
  end
end
