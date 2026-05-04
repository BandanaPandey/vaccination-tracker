require "test_helper"

class ApiV1AuthFlowTest < ActionDispatch::IntegrationTest
  test "signs up a new user" do
    assert_difference("User.count", 1) do
      post "/api/v1/auth/signup", params: {
        user: {
          name: "Priya Shah",
          email: "priya@example.com",
          password: "password123",
          password_confirmation: "password123"
        }
      }, as: :json
    end

    assert_response :created
    assert json_response["token"].present?
    assert_equal "Priya Shah", json_response["user"]["name"]
    assert_equal ["password"], json_response["auth"]["available_methods"]
    assert_equal true, json_response["auth"]["oauth_ready"]
  end

  test "logs in an existing user" do
    user = User.create!(
      name: "Existing User",
      email: "existing@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    post "/api/v1/auth/login", params: {
      session: {
        email: user.email,
        password: "password123"
      }
    }, as: :json

    assert_response :success
    assert json_response["token"].present?
    assert_equal user.email, json_response["user"]["email"]
  end

  test "rejects invalid credentials" do
    user = User.create!(
      name: "Existing User",
      email: "existing@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    post "/api/v1/auth/login", params: {
      session: {
        email: user.email,
        password: "wrong-password"
      }
    }, as: :json

    assert_response :unauthorized
    assert_equal "Email or password is invalid", json_response["error"]
  end

  test "returns current user for a valid token" do
    user = User.create!(
      name: "Current User",
      email: "current@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    get "/api/v1/auth/me", headers: auth_headers_for(user)

    assert_response :success
    assert_equal user.email, json_response["user"]["email"]
    assert_equal true, json_response["auth"]["oauth_ready"]
  end

  test "rejects current user request without token" do
    get "/api/v1/auth/me"

    assert_response :unauthorized
  end

  test "logs out an authenticated user" do
    user = User.create!(
      name: "Logout User",
      email: "logout@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    delete "/api/v1/auth/logout", headers: auth_headers_for(user)

    assert_response :success
    assert_equal "Logged out", json_response["message"]
  end
end
