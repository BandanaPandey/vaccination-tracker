require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "normalizes email before validation" do
    user = User.create!(
      name: "Bandana Pandey",
      email: "  BANDANA@Example.COM ",
      password: "password123",
      password_confirmation: "password123"
    )

    assert_equal "bandana@example.com", user.email
  end

  test "enforces case-insensitive unique emails" do
    User.create!(
      name: "Existing User",
      email: "duplicate@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    duplicate = User.new(
      name: "Duplicate User",
      email: "DUPLICATE@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:email], "has already been taken"
  end
end
