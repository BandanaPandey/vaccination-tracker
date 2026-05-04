class AuthToken
  EXPIRY = 30.days

  def self.issue_for(user)
    verifier.generate(
      {
        user_id: user.id,
        expires_at: EXPIRY.from_now.to_i
      }
    )
  end

  def self.user_from(token)
    payload = verifier.verified(token)
    return nil unless payload.is_a?(Hash)

    expires_at = payload["expires_at"] || payload[:expires_at]
    user_id = payload["user_id"] || payload[:user_id]
    return nil if expires_at.to_i < Time.current.to_i

    User.find_by(id: user_id)
  rescue ActiveSupport::MessageVerifier::InvalidSignature
    nil
  end

  def self.verifier
    Rails.application.message_verifier("auth-token")
  end
end
