require "test_helper"

class ProfileScheduleTest < ActiveSupport::TestCase
  test "builds an India routine schedule and matches records chronologically" do
    user = User.create!(name: "Bandana Pandey", email: "bandana-schedule@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(
      name: "Aarav Pandey",
      relationship_kind: "child",
      schedule_region: "IN",
      date_of_birth: Date.new(2025, 1, 1)
    )

    first_opv = profile.vaccination_records.create!(vaccine_name: "OPV", date_administered: Date.new(2025, 2, 15), dose_number: 1)
    second_opv = profile.vaccination_records.create!(vaccine_name: "opv", date_administered: Date.new(2025, 3, 15), dose_number: 3)
    mmr = profile.vaccination_records.create!(vaccine_name: "MMR", date_administered: Date.new(2025, 10, 1), dose_number: 1)

    payload = ProfileSchedule.call(profile, reference_date: Date.new(2025, 10, 10), generated_at: Time.zone.parse("2025-10-10 10:00:00"))

    assert_equal false, payload[:missing_date_of_birth]
    assert_equal "IN", payload[:schedule_region]
    assert_equal 15, payload[:items].length
    assert_equal "2025-10-10T10:00:00Z", payload[:generated_at]

    opv_items = payload[:items].select { |item| item[:vaccine_name] == "OPV" }
    assert_equal [first_opv.id, second_opv.id, nil], opv_items.map { |item| item[:matched_record_id] }
    assert_equal ["completed", "completed", "overdue"], opv_items.map { |item| item[:status] }

    mmr_item = payload[:items].find { |item| item[:schedule_key] == "mmr-1" }
    assert_equal mmr.id, mmr_item[:matched_record_id]
    assert_equal "completed", mmr_item[:status]
  end

  test "uses the US starter definitions through the same engine" do
    user = User.create!(name: "US Parent", email: "us-parent@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(
      name: "Maya",
      relationship_kind: "child",
      schedule_region: "US",
      date_of_birth: Date.new(2025, 1, 1)
    )

    payload = ProfileSchedule.call(profile, reference_date: Date.new(2025, 1, 2))

    assert_equal "US", payload[:schedule_region]
    assert_equal ["Hepatitis B", "DTaP", "IPV", "MMR"], payload[:items].map { |item| item[:vaccine_name] }
    assert_equal "overdue", payload[:items].first[:status]
    assert_equal "upcoming", payload[:items].second[:status]
  end

  test "returns an empty schedule payload when date of birth is missing" do
    user = User.create!(name: "Bandana Pandey", email: "missing-dob@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Bandana Pandey", relationship_kind: "self", schedule_region: "IN")

    payload = ProfileSchedule.call(profile)

    assert_equal true, payload[:missing_date_of_birth]
    assert_equal [], payload[:items]
    assert_equal({ completed: 0, upcoming: 0, overdue: 0 }, payload[:summary])
  end
end
