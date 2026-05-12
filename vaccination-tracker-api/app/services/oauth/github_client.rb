require "json"
require "net/http"
require "uri"

module Oauth
  class GithubClient
    AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize".freeze
    TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token".freeze
    USER_ENDPOINT = "https://api.github.com/user".freeze
    EMAILS_ENDPOINT = "https://api.github.com/user/emails".freeze
    SCOPE = "read:user user:email".freeze

    def provider_key
      "github"
    end

    def authorization_url(state:, redirect_uri:)
      uri = URI(AUTHORIZATION_ENDPOINT)
      uri.query = URI.encode_www_form(
        client_id: ENV.fetch("GITHUB_CLIENT_ID"),
        redirect_uri: redirect_uri,
        scope: SCOPE,
        state: state
      )
      uri.to_s
    end

    def fetch_identity(code:, redirect_uri:)
      token_payload = post_form(
        TOKEN_ENDPOINT,
        client_id: ENV.fetch("GITHUB_CLIENT_ID"),
        client_secret: ENV.fetch("GITHUB_CLIENT_SECRET"),
        code: code,
        redirect_uri: redirect_uri
      )
      access_token = token_payload.fetch("access_token")
      user_info = get_json(USER_ENDPOINT, access_token:)
      email = user_info["email"].to_s.strip.downcase.presence || primary_email(access_token)

      {
        provider: provider_key,
        uid: user_info.fetch("id").to_s,
        email: email,
        name: user_info["name"].to_s.strip.presence || user_info["login"].to_s.strip.presence,
        metadata: {
          login: user_info["login"],
          avatar_url: user_info["avatar_url"]
        }.compact
      }
    rescue KeyError => error
      raise ExchangeError, error.message
    end

    private

    def primary_email(access_token)
      emails = get_json(EMAILS_ENDPOINT, access_token:)
      preferred_email = emails.find { |entry| entry["primary"] && entry["verified"] } || emails.find { |entry| entry["verified"] }
      preferred_email&.fetch("email", nil).to_s.strip.downcase.presence
    end

    def post_form(endpoint, attributes)
      uri = URI(endpoint)
      request = Net::HTTP::Post.new(uri)
      request["Accept"] = "application/json"
      request["User-Agent"] = "VaccinationTracker"
      request.set_form_data(attributes)
      perform_json_request(uri, request)
    end

    def get_json(endpoint, access_token:)
      uri = URI(endpoint)
      request = Net::HTTP::Get.new(uri)
      request["Accept"] = "application/vnd.github+json"
      request["Authorization"] = "Bearer #{access_token}"
      request["User-Agent"] = "VaccinationTracker"
      perform_json_request(uri, request)
    end

    def perform_json_request(uri, request)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.request(request)
      end

      body = JSON.parse(response.body.presence || "{}")
      return body if response.is_a?(Net::HTTPSuccess)

      message = body["error_description"] || body["error"] || body["message"] || response.message
      raise ExchangeError, message
    rescue JSON::ParserError
      raise ExchangeError, "Unable to complete GitHub sign-in."
    end
  end
end
