require "test_helper"

class ProfileTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      name: "Profile Owner",
      email: "profile-owner@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end

  test "normalizes schedule region and validates relationship kind" do
    profile = @user.profiles.create!(
      name: "Aarav",
      relationship_kind: "child",
      schedule_region: " us "
    )

    assert_equal "US", profile.schedule_region
  end

  test "requires a supported relationship kind" do
    profile = @user.profiles.new(name: "Invalid", relationship_kind: "parent")

    assert_not profile.valid?
    assert_includes profile.errors[:relationship_kind], "is not included in the list"
  end

  test "belongs to a user" do
    profile = @user.profiles.create!(
      name: "Bandana Pandey",
      relationship_kind: "self",
      schedule_region: "IN"
    )

    assert_equal @user, profile.user
  end
end
