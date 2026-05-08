class FamilyDashboard
  ATTENTION_ITEM_LIMIT = 8
  RECENT_ACTIVITY_LIMIT = 8
  PROFILE_NEXT_ITEM_LIMIT = 3

  def self.call(user, reference_date: Date.current, generated_at: Time.current)
    new(user, reference_date:, generated_at:).call
  end

  def initialize(user, reference_date:, generated_at:)
    @user = user
    @reference_date = reference_date
    @generated_at = generated_at
  end

  def call
    profile_rows = user.profiles.ordered.map do |profile|
      schedule = ProfileSchedule.call(profile, reference_date:, generated_at:)
      { profile:, schedule: }
    end

    {
      generated_at: generated_at.iso8601,
      family_summary: build_family_summary(profile_rows),
      profiles: build_profiles_payload(profile_rows),
      recent_activity: build_recent_activity,
      attention_items: build_attention_items(profile_rows)
    }
  end

  private

  attr_reader :user, :reference_date, :generated_at

  def build_family_summary(profile_rows)
    totals = profile_rows.each_with_object({ completed: 0, upcoming: 0, overdue: 0 }) do |row, summary|
      row.fetch(:schedule).fetch(:summary).each do |key, value|
        summary[key.to_sym] += value
      end
    end

    {
      total_profiles: profile_rows.length,
      completed: totals[:completed],
      upcoming: totals[:upcoming],
      overdue: totals[:overdue]
    }
  end

  def build_profiles_payload(profile_rows)
    profile_rows.map do |row|
      profile = row.fetch(:profile)
      schedule = row.fetch(:schedule)

      {
        id: profile.id,
        name: profile.name,
        relationship_kind: profile.relationship_kind,
        schedule_region: profile.schedule_region,
        date_of_birth: profile.date_of_birth&.iso8601,
        has_date_of_birth: profile.date_of_birth.present?,
        summary: schedule.fetch(:summary),
        next_items: next_items_for(schedule)
      }
    end
  end

  def build_recent_activity
    user.vaccination_records.ordered.limit(RECENT_ACTIVITY_LIMIT).map do |record|
      {
        id: record.id,
        profile_id: record.profile_id,
        profile_name: record.profile.name,
        vaccine_name: record.vaccine_name,
        date_administered: record.date_administered.iso8601,
        dose_number: record.dose_number,
        provider: record.provider,
        proof_attached: record.proof.attached?
      }
    end
  end

  def build_attention_items(profile_rows)
    profile_rows.flat_map do |row|
      profile = row.fetch(:profile)
      row.fetch(:schedule).fetch(:items).filter_map do |item|
        next unless %w[overdue upcoming].include?(item.fetch(:status))

        item.merge(
          profile_id: profile.id,
          profile_name: profile.name,
          relationship_kind: profile.relationship_kind,
          schedule_region: profile.schedule_region
        )
      end
    end.sort_by { |item| [status_rank(item.fetch(:status)), item.fetch(:due_date), item.fetch(:profile_name), item.fetch(:vaccine_name)] }
      .first(ATTENTION_ITEM_LIMIT)
  end

  def next_items_for(schedule)
    schedule.fetch(:items)
      .select { |item| %w[overdue upcoming].include?(item.fetch(:status)) }
      .sort_by { |item| [status_rank(item.fetch(:status)), item.fetch(:due_date), item.fetch(:vaccine_name)] }
      .first(PROFILE_NEXT_ITEM_LIMIT)
  end

  def status_rank(status)
    status == 'overdue' ? 0 : 1
  end
end
