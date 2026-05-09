class ReminderPreference < ApplicationRecord
  DEFAULT_LEAD_DAYS = 7

  belongs_to :user

  validates :lead_days, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 365 }
end
