require "test_helper"

class VaccinationCertificateTest < ActiveSupport::TestCase
  test "builds certificate payload from profile details and vaccination records" do
    user = User.create!(name: "Certificate User", email: "certificate-service@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Aarav Pandey", relationship_kind: "child", schedule_region: "IN", date_of_birth: Date.new(2022, 8, 10), gender: "male")
    profile.vaccination_records.create!(vaccine_name: "MMR", date_administered: Date.new(2025, 1, 12), dose_number: 1, provider: "Metro Clinic")

    certificate = VaccinationCertificate.new(profile, generated_at: Time.zone.parse("2026-05-10 09:00:00"))
    pdf = certificate.call
    payload = certificate.payload

    assert_includes pdf, "%PDF"
    assert_equal "2026-05-10", payload[:generated_on]
    assert_equal "Aarav Pandey", payload[:profile][:name]
    assert_equal "2022-08-10", payload[:profile][:date_of_birth]
    assert_equal 1, payload[:profile][:recorded_vaccines]
    assert_equal "MMR", payload[:records].first[:vaccine_name]
    assert_equal "Metro Clinic", payload[:records].first[:provider]
  end

  test "builds a friendly empty payload when no vaccinations are recorded" do
    user = User.create!(name: "Empty Certificate", email: "certificate-empty@example.com", password: "password123", password_confirmation: "password123")
    profile = user.profiles.create!(name: "Bandana Pandey", relationship_kind: "self", schedule_region: "US")

    certificate = VaccinationCertificate.new(profile, generated_at: Time.zone.parse("2026-05-10 09:00:00"))
    pdf = certificate.call
    payload = certificate.payload

    assert_includes pdf, "%PDF"
    assert_equal "Bandana Pandey", payload[:profile][:name]
    assert_equal 0, payload[:profile][:recorded_vaccines]
    assert_empty payload[:records]
  end
end
