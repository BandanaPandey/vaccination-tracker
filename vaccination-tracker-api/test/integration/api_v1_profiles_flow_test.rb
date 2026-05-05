require "test_helper"

class ApiV1ProfilesFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(
      name: "Bandana Pandey",
      email: "bandana@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @self_profile = @user.profiles.create!(
      name: "Bandana Pandey",
      relationship_kind: "self",
      schedule_region: "IN"
    )

    @other_user = User.create!(
      name: "Other User",
      email: "other@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @other_profile = @other_user.profiles.create!(
      name: "Other Child",
      relationship_kind: "child",
      schedule_region: "US"
    )
  end

  test "lists only the signed in user's profiles" do
    get "/api/v1/profiles", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal 1, json_response.length
    assert_equal @self_profile.id, json_response.first["id"]
  end

  test "creates a profile for the signed in user" do
    assert_difference("Profile.count", 1) do
      post "/api/v1/profiles", params: {
        profile: {
          name: "Aarav Pandey",
          relationship_kind: "child",
          date_of_birth: "2022-08-10",
          gender: "male",
          medical_notes: "Peanut allergy",
          schedule_region: "us"
        }
      }, as: :json, headers: auth_headers_for(@user)
    end

    assert_response :created
    assert_equal "Aarav Pandey", json_response["name"]
    assert_equal "US", json_response["schedule_region"]
  end

  test "shows and updates an owned profile" do
    get "/api/v1/profiles/#{@self_profile.id}", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal "Bandana Pandey", json_response["name"]

    patch "/api/v1/profiles/#{@self_profile.id}", params: {
      profile: {
        name: "Bandana P.",
        medical_notes: "Needs annual flu shots"
      }
    }, as: :json, headers: auth_headers_for(@user)

    assert_response :success
    assert_equal "Bandana P.", json_response["name"]
    assert_equal "Needs annual flu shots", @self_profile.reload.medical_notes
  end

  test "deletes an owned profile" do
    child = @user.profiles.create!(name: "Nisha", relationship_kind: "child", schedule_region: "IN")

    assert_difference("Profile.count", -1) do
      delete "/api/v1/profiles/#{child.id}", headers: auth_headers_for(@user)
    end

    assert_response :no_content
  end

  test "blocks access to another user's profile" do
    get "/api/v1/profiles/#{@other_profile.id}", headers: auth_headers_for(@user)
    assert_response :not_found

    patch "/api/v1/profiles/#{@other_profile.id}", params: {
      profile: { name: "Intrusion" }
    }, as: :json, headers: auth_headers_for(@user)
    assert_response :not_found

    delete "/api/v1/profiles/#{@other_profile.id}", headers: auth_headers_for(@user)
    assert_response :not_found
  end
end
