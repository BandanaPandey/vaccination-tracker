require "test_helper"

class ApiV1ProfileSchedulesFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(
      name: "Bandana Pandey",
      email: "bandana-schedules-api@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @profile = @user.profiles.create!(
      name: "Aarav Pandey",
      relationship_kind: "child",
      schedule_region: "IN",
      date_of_birth: Date.new(2025, 1, 1)
    )
    @record = @profile.vaccination_records.create!(
      vaccine_name: "BCG",
      date_administered: Date.new(2025, 1, 1),
      dose_number: 1
    )

    @other_user = User.create!(
      name: "Other User",
      email: "other-schedules-api@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @other_profile = @other_user.profiles.create!(
      name: "Other Child",
      relationship_kind: "child",
      schedule_region: "US",
      date_of_birth: Date.new(2025, 2, 1)
    )
  end

  test "returns schedule summary and items for an owned profile" do
    travel_to Time.zone.parse("2025-04-20 09:00:00") do
      get "/api/v1/profiles/#{@profile.id}/schedule", headers: auth_headers_for(@user)
    end

    assert_response :success
    assert_equal @profile.id, json_response["profile_id"]
    assert_equal "IN", json_response["schedule_region"]
    assert_equal false, json_response["missing_date_of_birth"]
    assert_equal ["completed", "upcoming", "overdue"].sort, json_response["summary"].keys.sort

    bcg_item = json_response["items"].find { |item| item["schedule_key"] == "bcg-birth" }
    assert_equal "completed", bcg_item["status"]
    assert_equal @record.id, bcg_item["matched_record_id"]
  end

  test "returns an unschedulable response when date of birth is missing" do
    profile = @user.profiles.create!(name: "Bandana Pandey", relationship_kind: "self", schedule_region: "IN")

    get "/api/v1/profiles/#{profile.id}/schedule", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal true, json_response["missing_date_of_birth"]
    assert_equal [], json_response["items"]
  end

  test "blocks access to another user's schedule" do
    get "/api/v1/profiles/#{@other_profile.id}/schedule", headers: auth_headers_for(@user)

    assert_response :not_found
  end
end
