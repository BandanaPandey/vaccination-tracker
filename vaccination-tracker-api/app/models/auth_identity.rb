class AuthIdentity < ApplicationRecord
  belongs_to :user

  before_validation :normalize_fields

  validates :provider, presence: true
  validates :uid, presence: true, uniqueness: { scope: :provider, case_sensitive: false }
  validates :email, uniqueness: { case_sensitive: false }, allow_blank: true

  private

  def normalize_fields
    self.provider = provider.to_s.strip.downcase
    self.uid = uid.to_s.strip
    self.email = email.to_s.strip.downcase.presence
  end
end
