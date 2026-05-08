class User < ApplicationRecord
  has_secure_password

  has_many :auth_identities, dependent: :destroy
  has_many :profiles, -> { ordered }, dependent: :destroy
  has_many :vaccination_records, through: :profiles

  before_validation :normalize_email

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase
  end
end
