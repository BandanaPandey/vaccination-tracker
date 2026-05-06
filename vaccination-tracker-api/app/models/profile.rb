class Profile < ApplicationRecord
  RELATIONSHIP_KINDS = %w[self child dependent].freeze
  DEFAULT_SCHEDULE_REGION = "IN"

  belongs_to :user

  has_many :vaccination_records, -> { ordered }, dependent: :destroy

  before_validation :normalize_schedule_region

  validates :name, presence: true
  validates :relationship_kind, presence: true, inclusion: { in: RELATIONSHIP_KINDS }
  validates :schedule_region, presence: true

  scope :ordered, -> { order(:created_at, :id) }

  private

  def normalize_schedule_region
    self.schedule_region = schedule_region.to_s.strip.upcase.presence || DEFAULT_SCHEDULE_REGION
  end
end
