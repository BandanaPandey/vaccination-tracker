require "json"
require "net/http"
require "uri"

module Oauth
  class GoogleClient
    AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth".freeze
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token".freeze
    USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo".freeze
    SCOPE = "openid email profile".freeze

    def provider_key
      "google"
    end

    def authorization_url(state:, redirect_uri:)
      uri = URI(AUTHORIZATION_ENDPOINT)
      uri.query = URI.encode_www_form(
        client_id: ENV.fetch("GOOGLE_CLIENT_ID"),
        redirect_uri: redirect_uri,
        response_type: "code",
        scope: SCOPE,
        access_type: "online",
        prompt: "select_account",
        state: state
      )
      uri.to_s
    end

    def fetch_identity(code:, redirect_uri:)
      token_payload = post_form(
        TOKEN_ENDPOINT,
        code: code,
        client_id: ENV.fetch("GOOGLE_CLIENT_ID"),
        client_secret: ENV.fetch("GOOGLE_CLIENT_SECRET"),
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      )
      access_token = token_payload.fetch("access_token")
      user_info = get_json(USERINFO_ENDPOINT, headers: { "Authorization" => "Bearer #{access_token}" })

      {
        provider: provider_key,
        uid: user_info.fetch("sub").to_s,
        email: user_info["email"].to_s.strip.downcase.presence,
        name: user_info["name"].to_s.strip.presence || user_info["given_name"].to_s.strip.presence,
        metadata: {
          picture: user_info["picture"],
          locale: user_info["locale"]
        }.compact
      }
    rescue KeyError => error
      raise ExchangeError, error.message
    end

    private

    def post_form(endpoint, attributes)
      uri = URI(endpoint)
      request = Net::HTTP::Post.new(uri)
      request["Accept"] = "application/json"
      request.set_form_data(attributes)
      perform_json_request(uri, request)
    end

    def get_json(endpoint, headers: {})
      uri = URI(endpoint)
      request = Net::HTTP::Get.new(uri)
      headers.each { |key, value| request[key] = value }
      perform_json_request(uri, request)
    end

    def perform_json_request(uri, request)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.request(request)
      end

      body = JSON.parse(response.body.presence || "{}")
      return body if response.is_a?(Net::HTTPSuccess)

      message = body["error_description"] || body["error"] || response.message
      raise ExchangeError, message
    rescue JSON::ParserError
      raise ExchangeError, "Unable to complete Google sign-in."
    end
  end
end
