class ReminderCandidateSelector
  def self.call(user, reminder_preference: user.reminder_preference_or_default, reference_date: Date.current, generated_at: Time.current)
    new(user, reminder_preference:, reference_date:, generated_at:).call
  end

  def initialize(user, reminder_preference:, reference_date:, generated_at:)
    @user = user
    @reminder_preference = reminder_preference
    @reference_date = reference_date
    @generated_at = generated_at
  end

  def call
    user.profiles.ordered.flat_map do |profile|
      schedule = ProfileSchedule.call(profile, reference_date:, generated_at:)
      next [] if schedule[:missing_date_of_birth]

      schedule[:items].filter_map do |item|
        build_candidate(profile, item)
      end
    end.sort_by do |candidate|
      [candidate[:kind] == "overdue" ? 0 : 1, candidate[:due_date], candidate[:profile].id, candidate[:schedule_key]]
    end
  end

  private

  attr_reader :user, :reminder_preference, :reference_date, :generated_at

  def build_candidate(profile, item)
    return if item[:status] == "completed"

    due_date = Date.iso8601(item.fetch(:due_date))

    if due_date < reference_date
      return unless reminder_preference.overdue_enabled?
      return candidate_payload(profile, item, due_date, "overdue")
    end

    return if due_date > reference_date + reminder_preference.lead_days.days

    candidate_payload(profile, item, due_date, "upcoming")
  end

  def candidate_payload(profile, item, due_date, kind)
    {
      profile: profile,
      profile_id: profile.id,
      profile_name: profile.name,
      schedule_region: profile.schedule_region,
      relationship_kind: profile.relationship_kind,
      kind: kind,
      schedule_key: item.fetch(:schedule_key),
      vaccine_name: item.fetch(:vaccine_name),
      dose_label: item.fetch(:dose_label),
      due_date: due_date,
      recommended_age_window: item.fetch(:recommended_age_window),
      status: item.fetch(:status)
    }
  end
end
