class FamilyCalendar
  def self.call(user, month: nil, reference_date: Date.current, generated_at: Time.current)
    new(user, month:, reference_date:, generated_at:).call
  end

  def initialize(user, month:, reference_date:, generated_at:)
    @user = user
    @month = month
    @reference_date = reference_date
    @generated_at = generated_at
  end

  def call
    target_month = parsed_month
    range = target_month.beginning_of_month..target_month.end_of_month

    day_map = range.each_with_object({}) do |date, hash|
      hash[date.iso8601] = { date: date.iso8601, items: [] }
    end

    user.profiles.ordered.each do |profile|
      schedule = ProfileSchedule.call(profile, reference_date:, generated_at:)
      next if schedule.fetch(:missing_date_of_birth)

      schedule.fetch(:items).each do |item|
        due_date = Date.iso8601(item.fetch(:due_date))
        next unless range.cover?(due_date)

        day_map[due_date.iso8601][:items] << item.merge(
          profile_id: profile.id,
          profile_name: profile.name,
          relationship_kind: profile.relationship_kind,
          schedule_region: profile.schedule_region
        )
      end
    end

    day_map.each_value do |day|
      day[:items].sort_by! { |item| [status_rank(item.fetch(:status)), item.fetch(:profile_name), item.fetch(:vaccine_name)] }
    end

    {
      month: target_month.strftime('%Y-%m'),
      generated_at: generated_at.iso8601,
      days: day_map.values
    }
  end

  private

  attr_reader :user, :month, :reference_date, :generated_at

  def parsed_month
    return reference_date.beginning_of_month if month.blank?

    Date.strptime(month, '%Y-%m').beginning_of_month
  rescue ArgumentError
    reference_date.beginning_of_month
  end

  def status_rank(status)
    case status
    when 'overdue' then 0
    when 'upcoming' then 1
    else 2
    end
  end
end
