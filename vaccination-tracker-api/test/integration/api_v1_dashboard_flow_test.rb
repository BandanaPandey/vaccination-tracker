require "test_helper"

class ApiV1DashboardFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(name: "Bandana Pandey", email: "dashboard-api@example.com", password: "password123", password_confirmation: "password123")
    @child = @user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    @user.profiles.create!(name: "Bandana", relationship_kind: "self", schedule_region: "US")
    @record = @child.vaccination_records.create!(vaccine_name: "BCG", date_administered: Date.new(2025, 1, 1), dose_number: 1)

    @other_user = User.create!(name: "Other User", email: "other-dashboard-api@example.com", password: "password123", password_confirmation: "password123")
    other_profile = @other_user.profiles.create!(name: "Other Child", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    other_profile.vaccination_records.create!(vaccine_name: "BCG", date_administered: Date.new(2025, 1, 1), dose_number: 1)
  end

  test "returns family totals, profile rollups, recent activity, and attention items" do
    travel_to Time.zone.parse("2025-04-20 09:00:00") do
      get "/api/v1/dashboard", headers: auth_headers_for(@user)
    end

    assert_response :success
    assert_equal 2, json_response["family_summary"]["total_profiles"]
    assert_equal @record.id, json_response["recent_activity"].first["id"]
    assert_equal 2, json_response["profiles"].length
    assert_equal true, json_response["profiles"].find { |profile| profile["id"] == @child.id }["has_date_of_birth"]
    assert json_response["attention_items"].all? { |item| item["profile_name"].present? }
  end
end
