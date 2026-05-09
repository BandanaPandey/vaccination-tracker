class ReminderDelivery < ApplicationRecord
  CHANNELS = %w[email sms].freeze
  STATUSES = %w[sent failed].freeze
  KINDS = %w[upcoming overdue].freeze

  belongs_to :user
  belongs_to :profile

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :schedule_key, presence: true
  validates :vaccine_name, presence: true
  validates :due_date, presence: true
  validates :kind, presence: true, inclusion: { in: KINDS }
  validates :sent_at, presence: true

  scope :ordered, -> { order(sent_at: :desc, created_at: :desc, id: :desc) }
end
