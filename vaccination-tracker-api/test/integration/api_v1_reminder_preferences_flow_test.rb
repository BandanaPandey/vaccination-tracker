require "test_helper"

class ApiV1ReminderPreferencesFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(name: "Reminder Prefs", email: "reminder-prefs@example.com", password: "password123", password_confirmation: "password123")
    @other_user = User.create!(name: "Other Reminder Prefs", email: "other-reminder-prefs@example.com", password: "password123", password_confirmation: "password123")
  end

  test "fetches and updates reminder preferences for the signed-in user" do
    get "/api/v1/reminder_preferences", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal true, json_response["email_enabled"]
    assert_equal false, json_response["sms_enabled"]

    patch "/api/v1/reminder_preferences",
      params: {
        reminder_preference: {
          email_enabled: true,
          sms_enabled: true,
          lead_days: 3,
          overdue_enabled: false,
          phone_number: "+15555550111"
        }
      },
      headers: auth_headers_for(@user),
      as: :json

    assert_response :success
    assert_equal "+15555550111", json_response["phone_number"]
    assert_equal true, json_response["sms_enabled"]
    assert_equal 3, json_response["lead_days"]
    assert_equal false, json_response["overdue_enabled"]
    assert_nil @other_user.reload.phone_number
  end
end
