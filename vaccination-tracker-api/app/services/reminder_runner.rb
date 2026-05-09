class ReminderRunner
  def self.call(user, reference_date: Date.current, generated_at: Time.current, sms_client: Sms::Client)
    new(user, reference_date:, generated_at:, sms_client:).call
  end

  def initialize(user, reference_date:, generated_at:, sms_client:)
    @user = user
    @reference_date = reference_date
    @generated_at = generated_at
    @sms_client = sms_client
  end

  def call
    preference = user.reminder_preference_or_default
    candidates = ReminderCandidateSelector.call(user, reminder_preference: preference, reference_date:, generated_at:)
    attempted = 0
    sent = 0
    failed = 0
    skipped = 0

    candidates.each do |candidate|
      channels_for(preference).each do |channel|
        if duplicate_delivery?(candidate, channel)
          skipped += 1
          next
        end

        attempted += 1

        begin
          deliver_candidate(candidate, channel)
          log_delivery!(candidate, channel, "sent")
          sent += 1
        rescue StandardError => error
          log_delivery!(candidate, channel, "failed", error.message)
          failed += 1
        end
      end
    end

    {
      generated_at: generated_at.iso8601,
      attempted: attempted,
      sent: sent,
      failed: failed,
      skipped: skipped,
      candidates: candidates.length
    }
  end

  private

  attr_reader :user, :reference_date, :generated_at, :sms_client

  def channels_for(preference)
    channels = []
    channels << "email" if preference.email_enabled?
    channels << "sms" if preference.sms_enabled? && user.phone_number.present?
    channels
  end

  def duplicate_delivery?(candidate, channel)
    user.reminder_deliveries.where(
      profile_id: candidate.fetch(:profile_id),
      channel: channel,
      schedule_key: candidate.fetch(:schedule_key),
      due_date: candidate.fetch(:due_date),
      kind: candidate.fetch(:kind),
      sent_at: generated_at.beginning_of_day..generated_at.end_of_day
    ).exists?
  end

  def deliver_candidate(candidate, channel)
    if channel == "email"
      ReminderMailer.with(user:, candidate:).vaccine_reminder.deliver_now
    else
      sms_client.deliver(to: user.phone_number, body: sms_body(candidate))
    end
  end

  def sms_body(candidate)
    "Vaccination reminder: #{candidate.fetch(:profile_name)} has a #{candidate.fetch(:kind)} #{candidate.fetch(:vaccine_name)} #{candidate.fetch(:dose_label)} due on #{candidate.fetch(:due_date)}."
  end

  def log_delivery!(candidate, channel, status, error_message = nil)
    user.reminder_deliveries.create!(
      profile_id: candidate.fetch(:profile_id),
      channel: channel,
      status: status,
      schedule_key: candidate.fetch(:schedule_key),
      vaccine_name: candidate.fetch(:vaccine_name),
      due_date: candidate.fetch(:due_date),
      kind: candidate.fetch(:kind),
      sent_at: generated_at,
      error_message: error_message
    )
  end
end
