require "test_helper"

class ApiV1CalendarFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(name: "Bandana Pandey", email: "calendar-api@example.com", password: "password123", password_confirmation: "password123")
    @user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    @user.profiles.create!(name: "Bandana", relationship_kind: "self", schedule_region: "US")

    @other_user = User.create!(name: "Other User", email: "other-calendar-api@example.com", password: "password123", password_confirmation: "password123")
    @other_user.profiles.create!(name: "Other Child", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
  end

  test "returns day buckets for the requested month" do
    travel_to Time.zone.parse("2025-03-10 09:00:00") do
      get "/api/v1/calendar", params: { month: "2025-03" }, headers: auth_headers_for(@user)
    end

    assert_response :success
    assert_equal "2025-03", json_response["month"]
    march_day = json_response["days"].find { |day| day["date"] == "2025-03-12" }
    assert_not_nil march_day
    assert_equal "Aarav", march_day["items"].first["profile_name"]
  end

  test "profiles missing dob are excluded from calendar day items" do
    get "/api/v1/calendar", params: { month: "2025-05" }, headers: auth_headers_for(@user)

    assert_response :success
    assert json_response["days"].all? { |day| day["items"].none? { |item| item["profile_name"] == "Bandana" } }
  end
end
