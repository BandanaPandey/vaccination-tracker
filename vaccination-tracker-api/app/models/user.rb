class User < ApplicationRecord
  has_secure_password

  has_many :auth_identities, dependent: :destroy
  has_many :profiles, -> { ordered }, dependent: :destroy
  has_many :vaccination_records, through: :profiles
  has_one :reminder_preference, dependent: :destroy
  has_many :reminder_deliveries, -> { ordered }, dependent: :destroy

  before_validation :normalize_email
  before_validation :normalize_phone_number
  after_create :ensure_reminder_preference!

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  def reminder_preference_or_default
    reminder_preference || create_reminder_preference!(
      email_enabled: true,
      sms_enabled: false,
      lead_days: ReminderPreference::DEFAULT_LEAD_DAYS,
      overdue_enabled: true
    )
  end

  private

  def ensure_reminder_preference!
    reminder_preference_or_default
  end

  def normalize_email
    self.email = email.to_s.strip.downcase
  end

  def normalize_phone_number
    self.phone_number = phone_number.to_s.strip.presence
  end
end
