module Oauth
  class ProviderCatalog
    PROVIDERS = {
      "google" => {
        key: "google",
        label: "Google",
        client_id_env: "GOOGLE_CLIENT_ID",
        client_secret_env: "GOOGLE_CLIENT_SECRET"
      },
      "github" => {
        key: "github",
        label: "GitHub",
        client_id_env: "GITHUB_CLIENT_ID",
        client_secret_env: "GITHUB_CLIENT_SECRET"
      }
    }.freeze

    class << self
      def configured_providers
        PROVIDERS.values.select do |provider|
          ENV[provider.fetch(:client_id_env)].present? && ENV[provider.fetch(:client_secret_env)].present?
        end.map { |provider| provider.slice(:key, :label) }
      end

      def configured_provider_keys
        configured_providers.map { |provider| provider.fetch(:key) }
      end

      def fetch(provider)
        provider_key = provider.to_s.downcase
        config = PROVIDERS.fetch(provider_key) { raise ProviderNotConfiguredError, "Unsupported OAuth provider" }
        raise ProviderNotConfiguredError, "#{config.fetch(:label)} sign-in is not configured." unless configured?(config)

        case provider_key
        when "google" then GoogleClient.new
        when "github" then GithubClient.new
        else raise ProviderNotConfiguredError, "Unsupported OAuth provider"
        end
      end

      private

      def configured?(config)
        ENV[config.fetch(:client_id_env)].present? && ENV[config.fetch(:client_secret_env)].present?
      end
    end
  end
end
