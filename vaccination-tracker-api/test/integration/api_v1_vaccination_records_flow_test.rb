require "test_helper"
require "rack/test"

class ApiV1VaccinationRecordsFlowTest < ActionDispatch::IntegrationTest
  def setup
    @user = User.create!(
      name: "Bandana Pandey",
      email: "records@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @profile = @user.profiles.create!(
      name: "Bandana Pandey",
      relationship_kind: "self",
      schedule_region: "IN"
    )
    @record = @profile.vaccination_records.create!(
      vaccine_name: "MMR",
      date_administered: Date.new(2024, 1, 4),
      dose_number: 1,
      provider: "City Hospital",
      notes: "First dose"
    )

    @other_user = User.create!(
      name: "Other User",
      email: "other-records@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @other_profile = @other_user.profiles.create!(
      name: "Other Child",
      relationship_kind: "child",
      schedule_region: "US"
    )
    @other_record = @other_profile.vaccination_records.create!(
      vaccine_name: "Varicella",
      date_administered: Date.new(2023, 7, 12)
    )
  end

  test "lists records for an owned profile" do
    get "/api/v1/profiles/#{@profile.id}/vaccination_records", headers: auth_headers_for(@user)

    assert_response :success
    assert_equal 1, json_response.length
    assert_equal @record.id, json_response.first["id"]
  end

  test "creates a record with proof for an owned profile" do
    assert_difference("VaccinationRecord.count", 1) do
      post "/api/v1/profiles/#{@profile.id}/vaccination_records",
        params: {
          vaccination_record: {
            vaccine_name: "Polio",
            date_administered: "2024-03-22",
            dose_number: 2,
            provider: "Metro Clinic",
            notes: "Booster",
            proof: Rack::Test::UploadedFile.new(
              Rails.root.join("test/fixtures/files/sample-proof.pdf"),
              "application/pdf"
            )
          }
        },
        headers: auth_headers_for(@user)
    end

    assert_response :created
    assert_equal true, json_response["proof_attached"]
    assert_equal "sample-proof.pdf", json_response["proof_filename"]
  end

  test "updates a record and can remove proof" do
    @record.proof.attach(
      io: StringIO.new("proof"),
      filename: "existing-proof.pdf",
      content_type: "application/pdf"
    )

    patch "/api/v1/profiles/#{@profile.id}/vaccination_records/#{@record.id}",
      params: {
        vaccination_record: {
          vaccine_name: "MMR Updated",
          notes: "Updated notes",
          remove_proof: true
        }
      },
      headers: auth_headers_for(@user)

    assert_response :success
    assert_equal "MMR Updated", json_response["vaccine_name"]
    assert_equal false, json_response["proof_attached"]
    assert_equal "Updated notes", @record.reload.notes
  end

  test "deletes an owned record" do
    assert_difference("VaccinationRecord.count", -1) do
      delete "/api/v1/profiles/#{@profile.id}/vaccination_records/#{@record.id}", headers: auth_headers_for(@user)
    end

    assert_response :no_content
  end

  test "blocks cross user profile and record access" do
    get "/api/v1/profiles/#{@other_profile.id}/vaccination_records", headers: auth_headers_for(@user)
    assert_response :not_found

    get "/api/v1/profiles/#{@profile.id}/vaccination_records/#{@other_record.id}", headers: auth_headers_for(@user)
    assert_response :not_found

    patch "/api/v1/profiles/#{@other_profile.id}/vaccination_records/#{@other_record.id}",
      params: { vaccination_record: { vaccine_name: "Intrusion" } },
      headers: auth_headers_for(@user)
    assert_response :not_found
  end
end
