require "test_helper"

class OauthAuthenticationTest < ActiveSupport::TestCase
  test "links an existing identity back to its user" do
    user = UserOnboarding.create!(
      name: "Linked User",
      email: "linked@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    user.auth_identities.create!(provider: "google", uid: "google-1", email: "linked@example.com", metadata: {})

    authenticated_user = Oauth::Authentication.call(
      provider: "google",
      uid: "google-1",
      email: "linked@example.com",
      name: "Linked User",
      metadata: {}
    )

    assert_equal user, authenticated_user
  end

  test "auto links by email for an existing password account" do
    user = UserOnboarding.create!(
      name: "Password User",
      email: "password@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    authenticated_user = Oauth::Authentication.call(
      provider: "github",
      uid: "github-1",
      email: "password@example.com",
      name: "Password User",
      metadata: { "login" => "password-user" }
    )

    assert_equal user, authenticated_user
    assert_equal 1, user.auth_identities.where(provider: "github", uid: "github-1").count
  end

  test "creates a new user with a default profile when oauth user is new" do
    authenticated_user = Oauth::Authentication.call(
      provider: "google",
      uid: "google-new",
      email: "new-user@example.com",
      name: "New OAuth User",
      metadata: {}
    )

    assert_equal "new-user@example.com", authenticated_user.email
    assert_equal 1, authenticated_user.profiles.count
    assert_equal "self", authenticated_user.profiles.first.relationship_kind
    assert authenticated_user.reminder_preference.present?
  end

  test "rejects oauth users without a usable email" do
    error = assert_raises(Oauth::MissingEmailError) do
      Oauth::Authentication.call(
        provider: "github",
        uid: "github-missing-email",
        email: nil,
        name: "No Email",
        metadata: {}
      )
    end

    assert_match(/verified email address is required/i, error.message)
  end
end
