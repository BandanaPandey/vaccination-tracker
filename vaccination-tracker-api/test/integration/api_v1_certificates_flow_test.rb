require "test_helper"

class ApiV1CertificatesFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(name: "Certificate Api", email: "certificate-api@example.com", password: "password123", password_confirmation: "password123")
    @profile = @user.profiles.create!(name: "Aarav Pandey", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2022, 8, 10))
    @profile.vaccination_records.create!(vaccine_name: "MMR", date_administered: Date.new(2025, 1, 12), dose_number: 1, provider: "Metro Clinic")

    @other_user = User.create!(name: "Other Certificate Api", email: "other-certificate-api@example.com", password: "password123", password_confirmation: "password123")
    @other_profile = @other_user.profiles.create!(name: "Maya", relationship_kind: "child", schedule_region: "US")
  end

  test "downloads a pdf certificate for an owned profile" do
    get "/api/v1/profiles/#{@profile.id}/certificate", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal "application/pdf", response.media_type
    assert_match(/attachment;.*vaccination-certificate-aarav-pandey\.pdf/, response.headers["Content-Disposition"])
    assert_includes response.body, "%PDF"
    assert response.body.bytesize.positive?
  end

  test "returns not found for a profile owned by another user" do
    get "/api/v1/profiles/#{@other_profile.id}/certificate", headers: auth_headers_for(@user)

    assert_response :not_found
  end

  test "downloads a valid pdf when the profile has no recorded vaccinations" do
    get "/api/v1/profiles/#{@other_profile.id}/certificate", headers: auth_headers_for(@other_user)

    assert_response :success
    assert_equal "application/pdf", response.media_type
    assert_includes response.body, "%PDF"
    assert response.body.bytesize.positive?
  end
end
