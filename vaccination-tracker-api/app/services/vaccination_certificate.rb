class VaccinationCertificate
  def self.call(profile, generated_at: Time.current)
    new(profile, generated_at:).call
  end

  def initialize(profile, generated_at:)
    @profile = profile
    @generated_at = generated_at
  end

  def call
    Prawn::Document.new(page_size: "A4", margin: 48, compress: false) do |pdf|
      build_header(pdf)
      build_profile_summary(pdf)
      build_record_summary(pdf)
    end.render
  end

  def payload
    {
      generated_on: generated_at.in_time_zone.to_date.iso8601,
      profile: {
        name: profile.name,
        relationship: profile.relationship_kind.to_s.capitalize,
        date_of_birth: profile.date_of_birth&.iso8601 || "Not set",
        gender: profile.gender.presence || "Not set",
        schedule_region: profile.schedule_region,
        recorded_vaccines: profile.vaccination_records.count
      },
      records: profile.vaccination_records.ordered.map do |record|
        {
          vaccine_name: record.vaccine_name,
          date_administered: record.date_administered.iso8601,
          dose_label: record.dose_number ? "Dose #{record.dose_number}" : "Not set",
          provider: record.provider.presence || "Not recorded"
        }
      end
    }
  end

  def filename
    base = profile.name.to_s.parameterize.presence || "profile"
    "vaccination-certificate-#{base}.pdf"
  end

  private

  attr_reader :profile, :generated_at

  def build_header(pdf)
    pdf.text "Vaccination Certificate", size: 22, style: :bold
    pdf.move_down 8
    pdf.text "Generated on #{generated_at.in_time_zone.to_date.iso8601}", size: 10, color: "4B5563"
    pdf.move_down 18
  end

  def build_profile_summary(pdf)
    pdf.text "Profile Summary", size: 14, style: :bold
    pdf.move_down 10
    pdf.table(profile_rows, cell_style: { borders: [:bottom], padding: [8, 6], size: 10 }) do
      cells.border_color = "D1D5DB"
      row(0..-1).columns(0).font_style = :bold
      columns(0).width = 140
    end
    pdf.move_down 18
  end

  def build_record_summary(pdf)
    pdf.text "Recorded Vaccinations", size: 14, style: :bold
    pdf.move_down 8

    if profile.vaccination_records.ordered.none?
      pdf.text "No recorded vaccinations yet.", size: 11, color: "6B7280"
      return
    end

    pdf.text "Total recorded vaccines: #{profile.vaccination_records.count}", size: 10, color: "4B5563"
    pdf.move_down 8
    pdf.table(record_rows, header: true, cell_style: { padding: [7, 5], size: 9 }) do
      row(0).font_style = :bold
      row(0).background_color = "E0F2FE"
      cells.border_color = "CBD5E1"
      columns(0).width = 130
      columns(1).width = 90
      columns(2).width = 60
      columns(3).width = 150
    end
  end

  def profile_rows
    [
      ["Name", profile.name],
      ["Relationship", profile.relationship_kind.to_s.capitalize],
      ["Date of birth", profile.date_of_birth&.iso8601 || "Not set"],
      ["Gender", profile.gender.presence || "Not set"],
      ["Schedule region", profile.schedule_region],
      ["Recorded vaccines", profile.vaccination_records.count.to_s]
    ]
  end

  def record_rows
    [["Vaccine", "Date", "Dose", "Provider"]] + profile.vaccination_records.ordered.map do |record|
      [
        record.vaccine_name,
        record.date_administered.iso8601,
        record.dose_number ? "Dose #{record.dose_number}" : "Not set",
        record.provider.presence || "Not recorded"
      ]
    end
  end
end
