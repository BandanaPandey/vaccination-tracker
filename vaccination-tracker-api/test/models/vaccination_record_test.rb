require "test_helper"

class VaccinationRecordTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      name: "Record Owner",
      email: "record-owner@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    @profile = @user.profiles.create!(
      name: "Record Owner",
      relationship_kind: "self",
      schedule_region: "IN"
    )
  end

  test "validates required record fields" do
    record = @profile.vaccination_records.new

    assert_not record.valid?
    assert_includes record.errors[:vaccine_name], "can't be blank"
    assert_includes record.errors[:date_administered], "can't be blank"
  end

  test "belongs to a profile" do
    record = @profile.vaccination_records.create!(
      vaccine_name: "MMR",
      date_administered: Date.new(2024, 1, 4),
      dose_number: 1
    )

    assert_equal @profile, record.profile
  end

  test "accepts pdf proof attachments" do
    record = @profile.vaccination_records.new(
      vaccine_name: "Polio",
      date_administered: Date.new(2024, 2, 10)
    )
    record.proof.attach(
      io: StringIO.new("pdf proof"),
      filename: "proof.pdf",
      content_type: "application/pdf"
    )

    assert record.valid?
  end

  test "rejects unsupported proof attachments" do
    record = @profile.vaccination_records.new(
      vaccine_name: "Polio",
      date_administered: Date.new(2024, 2, 10)
    )
    record.proof.attach(
      io: StringIO.new("bad proof"),
      filename: "proof.txt",
      content_type: "text/plain"
    )

    assert_not record.valid?
    assert_includes record.errors[:proof], "must be an image or PDF"
  end
end
