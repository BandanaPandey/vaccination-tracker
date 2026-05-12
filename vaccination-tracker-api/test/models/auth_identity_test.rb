require "test_helper"

class AuthIdentityTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      name: "Auth Identity User",
      email: "identity@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end

  test "normalizes provider and email" do
    identity = AuthIdentity.create!(
      user: @user,
      provider: " Google ",
      uid: "abc123",
      email: "  USER@EXAMPLE.COM "
    )

    assert_equal "google", identity.provider
    assert_equal "user@example.com", identity.email
  end

  test "enforces unique provider and uid pairs" do
    AuthIdentity.create!(
      user: @user,
      provider: "google",
      uid: "abc123",
      email: "one@example.com"
    )

    duplicate = AuthIdentity.new(
      user: @user,
      provider: "GOOGLE",
      uid: "abc123",
      email: "two@example.com"
    )

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:uid], "has already been taken"
  end

  test "allows the same email across different providers" do
    AuthIdentity.create!(
      user: @user,
      provider: "google",
      uid: "abc123",
      email: "shared@example.com"
    )

    second_identity = AuthIdentity.new(
      user: @user,
      provider: "github",
      uid: "def456",
      email: "shared@example.com"
    )

    assert second_identity.valid?
  end
end
