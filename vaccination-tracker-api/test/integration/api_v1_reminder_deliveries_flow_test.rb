require "test_helper"

class ApiV1ReminderDeliveriesFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(name: "Reminder Delivery Api", email: "reminder-delivery-api@example.com", phone_number: "+15555550177", password: "password123", password_confirmation: "password123")
    @profile = @user.profiles.create!(name: "Aarav", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2025, 1, 1))
    @user.reminder_preference_or_default.update!(email_enabled: true, sms_enabled: false, lead_days: 10, overdue_enabled: true)

    @other_user = User.create!(name: "Other Delivery Api", email: "other-reminder-delivery-api@example.com", password: "password123", password_confirmation: "password123")
    @other_profile = @other_user.profiles.create!(name: "Maya", relationship_kind: "child", schedule_region: "US", date_of_birth: Date.new(2025, 1, 1))
    @other_user.reminder_deliveries.create!(profile: @other_profile, channel: "email", status: "sent", schedule_key: "mmr-1", vaccine_name: "MMR", due_date: Date.new(2025, 10, 1), kind: "upcoming", sent_at: Time.zone.parse("2025-05-09 09:00:00"))
  end

  test "runs reminders and returns the current user's reminder history" do
    travel_to Time.zone.parse("2025-03-10 09:00:00") do
      post "/api/v1/reminders/run", headers: auth_headers_for(@user)
    end

    assert_response :created
    assert json_response["sent"] > 0

    get "/api/v1/reminder_deliveries", headers: auth_headers_for(@user)

    assert_response :success
    assert json_response.any?
    assert_equal @profile.id, json_response.first["profile_id"]
    assert_equal "Aarav", json_response.first["profile_name"]
    assert_equal false, json_response.any? { |delivery| delivery["profile_name"] == "Maya" }
  end
end
