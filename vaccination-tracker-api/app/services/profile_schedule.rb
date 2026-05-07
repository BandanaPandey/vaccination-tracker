class ProfileSchedule
  Item = Struct.new(
    :schedule_key,
    :vaccine_name,
    :dose_label,
    :due_date,
    :recommended_age_window,
    keyword_init: true
  )

  REGION_DEFINITIONS = {
    "IN" => [
      { schedule_key: "bcg-birth", vaccine_name: "BCG", dose_label: "Dose 1", recommended_age_window: "At birth", offset: { days: 0 } },
      { schedule_key: "hep-b-birth", vaccine_name: "Hepatitis B", dose_label: "Birth dose", recommended_age_window: "At birth", offset: { days: 0 } },
      { schedule_key: "opv-1", vaccine_name: "OPV", dose_label: "Dose 1", recommended_age_window: "6 weeks", offset: { weeks: 6 } },
      { schedule_key: "pentavalent-1", vaccine_name: "Pentavalent", dose_label: "Dose 1", recommended_age_window: "6 weeks", offset: { weeks: 6 } },
      { schedule_key: "rotavirus-1", vaccine_name: "Rotavirus", dose_label: "Dose 1", recommended_age_window: "6 weeks", offset: { weeks: 6 } },
      { schedule_key: "pcv-1", vaccine_name: "PCV", dose_label: "Dose 1", recommended_age_window: "6 weeks", offset: { weeks: 6 } },
      { schedule_key: "opv-2", vaccine_name: "OPV", dose_label: "Dose 2", recommended_age_window: "10 weeks", offset: { weeks: 10 } },
      { schedule_key: "pentavalent-2", vaccine_name: "Pentavalent", dose_label: "Dose 2", recommended_age_window: "10 weeks", offset: { weeks: 10 } },
      { schedule_key: "rotavirus-2", vaccine_name: "Rotavirus", dose_label: "Dose 2", recommended_age_window: "10 weeks", offset: { weeks: 10 } },
      { schedule_key: "pcv-2", vaccine_name: "PCV", dose_label: "Dose 2", recommended_age_window: "10 weeks", offset: { weeks: 10 } },
      { schedule_key: "opv-3", vaccine_name: "OPV", dose_label: "Dose 3", recommended_age_window: "14 weeks", offset: { weeks: 14 } },
      { schedule_key: "pentavalent-3", vaccine_name: "Pentavalent", dose_label: "Dose 3", recommended_age_window: "14 weeks", offset: { weeks: 14 } },
      { schedule_key: "rotavirus-3", vaccine_name: "Rotavirus", dose_label: "Dose 3", recommended_age_window: "14 weeks", offset: { weeks: 14 } },
      { schedule_key: "ipv-1", vaccine_name: "IPV", dose_label: "Dose 1", recommended_age_window: "14 weeks", offset: { weeks: 14 } },
      { schedule_key: "mmr-1", vaccine_name: "MMR", dose_label: "Dose 1", recommended_age_window: "9 months", offset: { months: 9 } }
    ].freeze,
    "US" => [
      { schedule_key: "hep-b-birth", vaccine_name: "Hepatitis B", dose_label: "Dose 1", recommended_age_window: "Birth", offset: { days: 0 } },
      { schedule_key: "dtap-1", vaccine_name: "DTaP", dose_label: "Dose 1", recommended_age_window: "2 months", offset: { months: 2 } },
      { schedule_key: "ipv-1", vaccine_name: "IPV", dose_label: "Dose 1", recommended_age_window: "2 months", offset: { months: 2 } },
      { schedule_key: "mmr-1", vaccine_name: "MMR", dose_label: "Dose 1", recommended_age_window: "12 months", offset: { months: 12 } }
    ].freeze
  }.freeze

  def self.call(profile, reference_date: Date.current, generated_at: Time.current)
    new(profile, reference_date:, generated_at:).call
  end

  def initialize(profile, reference_date:, generated_at:)
    @profile = profile
    @reference_date = reference_date
    @generated_at = generated_at
  end

  def call
    return missing_date_payload unless profile.date_of_birth.present?

    schedule_items = build_items
    matched_items = reconcile(schedule_items)

    {
      profile_id: profile.id,
      schedule_region: region_code,
      generated_at: generated_at.iso8601,
      missing_date_of_birth: false,
      summary: summarize(matched_items),
      items: matched_items
    }
  end

  private

  attr_reader :profile, :reference_date, :generated_at

  def missing_date_payload
    {
      profile_id: profile.id,
      schedule_region: region_code,
      generated_at: generated_at.iso8601,
      missing_date_of_birth: true,
      summary: { completed: 0, upcoming: 0, overdue: 0 },
      items: []
    }
  end

  def region_code
    profile.schedule_region.presence_in(REGION_DEFINITIONS.keys) || Profile::DEFAULT_SCHEDULE_REGION
  end

  def definitions
    REGION_DEFINITIONS.fetch(region_code)
  end

  def build_items
    definitions.map do |definition|
      due_date = profile.date_of_birth + build_duration(definition.fetch(:offset))
      Item.new(
        schedule_key: definition.fetch(:schedule_key),
        vaccine_name: definition.fetch(:vaccine_name),
        dose_label: definition.fetch(:dose_label),
        due_date: due_date,
        recommended_age_window: definition.fetch(:recommended_age_window)
      )
    end
  end

  def reconcile(schedule_items)
    records_by_vaccine = profile.vaccination_records.to_a
      .sort_by { |record| [normalize_name(record.vaccine_name), record.date_administered, record.id] }
      .group_by { |record| normalize_name(record.vaccine_name) }

    schedule_items.map do |item|
      matching_records = records_by_vaccine[normalize_name(item.vaccine_name)] || []
      matched_record = matching_records.shift

      {
        schedule_key: item.schedule_key,
        vaccine_name: item.vaccine_name,
        dose_label: item.dose_label,
        due_date: item.due_date.iso8601,
        recommended_age_window: item.recommended_age_window,
        status: status_for(item.due_date, matched_record),
        matched_record_id: matched_record&.id,
        matched_record_date: matched_record&.date_administered&.iso8601
      }
    end
  end

  def summarize(items)
    items.each_with_object({ completed: 0, upcoming: 0, overdue: 0 }) do |item, summary|
      summary[item.fetch(:status).to_sym] += 1
    end
  end

  def status_for(due_date, matched_record)
    return "completed" if matched_record.present?
    return "overdue" if due_date < reference_date

    "upcoming"
  end

  def normalize_name(name)
    name.to_s.strip.downcase
  end

  def build_duration(offset)
    (offset[:years] || 0).years + (offset[:months] || 0).months + (offset[:weeks] || 0).weeks + (offset[:days] || 0).days
  end
end
