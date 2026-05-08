require "test_helper"

class FamilyDashboardTest < ActiveSupport::TestCase
  test "aggregates profile schedule totals, attention items, and recent activity" do
    user = User.create!(name: "Bandana Pandey", email: "family-dashboard@example.com", password: "password123", password_confirmation: "password123")
    child = user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    self_profile = user.profiles.create!(name: "Bandana", relationship_kind: "self", schedule_region: "US")

    child_record = child.vaccination_records.create!(vaccine_name: "BCG", date_administered: Date.new(2025, 1, 1), dose_number: 1)

    payload = FamilyDashboard.call(user, reference_date: Date.new(2025, 4, 20), generated_at: Time.zone.parse("2025-04-20 09:00:00"))

    assert_equal "2025-04-20T09:00:00Z", payload[:generated_at]
    assert_equal 2, payload[:family_summary][:total_profiles]
    assert_equal 1, payload[:family_summary][:completed]
    assert payload[:family_summary][:overdue] > 0
    assert_equal 2, payload[:profiles].length
    assert_equal true, payload[:profiles].find { |profile| profile[:id] == child.id }[:has_date_of_birth]
    assert_equal false, payload[:profiles].find { |profile| profile[:id] == self_profile.id }[:has_date_of_birth]
    assert_equal child_record.id, payload[:recent_activity].first[:id]
    assert_equal "Aarav", payload[:attention_items].first[:profile_name]
  end
end
