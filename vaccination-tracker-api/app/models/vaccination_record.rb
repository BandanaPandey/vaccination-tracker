class VaccinationRecord < ApplicationRecord
  ACCEPTED_PROOF_TYPES = ["application/pdf"].freeze

  belongs_to :profile

  has_one_attached :proof

  validates :vaccine_name, presence: true
  validates :date_administered, presence: true
  validates :dose_number, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :proof_must_be_supported_type

  scope :ordered, -> { order(date_administered: :desc, created_at: :desc, id: :desc) }

  private

  def proof_must_be_supported_type
    return unless proof.attached?

    return if proof.blob.content_type == "application/pdf"
    return if proof.blob.content_type.to_s.start_with?("image/")

    errors.add(:proof, "must be an image or PDF")
  end
end
