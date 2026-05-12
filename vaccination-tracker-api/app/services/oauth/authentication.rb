module Oauth
  class Authentication
    class << self
      def call(provider:, uid:, email:, name:, metadata: {})
        normalized_provider = provider.to_s.strip.downcase
        normalized_uid = uid.to_s.strip
        normalized_email = email.to_s.strip.downcase.presence

        identity = AuthIdentity.find_by(provider: normalized_provider, uid: normalized_uid)
        return identity.user if identity.present?

        raise MissingEmailError, "A verified email address is required to sign in with #{normalized_provider.titleize}." if normalized_email.blank?

        User.transaction do
          identity = AuthIdentity.lock.find_by(provider: normalized_provider, uid: normalized_uid)
          return identity.user if identity.present?

          generated_password = generated_password()
          user = User.lock.find_by(email: normalized_email) || UserOnboarding.create!(
            name: name.to_s.strip.presence || normalized_email.split("@").first.titleize,
            email: normalized_email,
            password: generated_password,
            password_confirmation: generated_password
          )

          UserOnboarding.ensure_default_profile!(user)
          user.auth_identities.create!(
            provider: normalized_provider,
            uid: normalized_uid,
            email: normalized_email,
            metadata: metadata
          )
          user
        end
      rescue ActiveRecord::RecordNotUnique
        retry
      end

      private

      def generated_password
        SecureRandom.base58(32)
      end
    end
  end
end
