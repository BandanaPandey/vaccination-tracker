require "test_helper"
require "cgi"
require "ostruct"
require "uri"

class ApiV1OauthFlowTest < ActionDispatch::IntegrationTest
  setup do
    @env = {
      "GOOGLE_CLIENT_ID" => "google-client-id",
      "GOOGLE_CLIENT_SECRET" => "google-client-secret",
      "GITHUB_CLIENT_ID" => "github-client-id",
      "GITHUB_CLIENT_SECRET" => "github-client-secret",
      "FRONTEND_APP_URL" => "http://localhost:3000"
    }
  end

  test "returns auth options with configured oauth providers" do
    with_env(@env) do
      get "/api/v1/auth/options"

      assert_response :success
      assert_equal ["password", "google", "github"], json_response["available_methods"]
      assert_equal ["google", "github"], json_response["oauth_providers"].map { |provider| provider["key"] }
    end
  end

  test "starts google oauth by redirecting to the provider url" do
    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://accounts.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end
    end.new("google")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/google"
      end

      assert_response :redirect
      assert_match(/accounts\.example\.test/, response.redirect_url)
      assert_match(/state=/, response.redirect_url)
    end
  end

  test "signs in an existing linked identity through google oauth callback" do
    user = UserOnboarding.create!(
      name: "Linked User",
      email: "linked-oauth@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
    user.auth_identities.create!(provider: "google", uid: "google-123", email: user.email, metadata: {})

    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://accounts.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end

      def fetch_identity(code:, redirect_uri:)
        {
          provider: "google",
          uid: "google-123",
          email: "linked-oauth@example.com",
          name: "Linked User",
          metadata: { "locale" => "en" }
        }
      end
    end.new("google")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/google"
        redirected_state = CGI.parse(URI.parse(response.redirect_url).query).fetch("state").first

        get "/api/v1/auth/oauth/google/callback", params: { state: redirected_state, code: "oauth-code" }
      end

      assert_response :success
      assert_match(/vaccination-tracker:oauth-result/, response.body)
      assert_match(/linked-oauth@example.com/, response.body)
      assert_match(/token/, response.body)
    end
  end

  test "auto links a github identity to an existing password account by email" do
    user = UserOnboarding.create!(
      name: "Password User",
      email: "password-user@example.com",
      password: "password123",
      password_confirmation: "password123"
    )

    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://github.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end

      def fetch_identity(code:, redirect_uri:)
        {
          provider: "github",
          uid: "github-456",
          email: "password-user@example.com",
          name: "Password User",
          metadata: { "login" => "password-user" }
        }
      end
    end.new("github")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/github"
        redirected_state = CGI.parse(URI.parse(response.redirect_url).query).fetch("state").first

        assert_difference("AuthIdentity.count", 1) do
          get "/api/v1/auth/oauth/github/callback", params: { state: redirected_state, code: "oauth-code" }
        end
      end

      assert_response :success
      assert_equal user, AuthIdentity.find_by(provider: "github", uid: "github-456").user
    end
  end

  test "creates a new account, profile, and reminder preference for a first-time oauth user" do
    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://accounts.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end

      def fetch_identity(code:, redirect_uri:)
        {
          provider: "google",
          uid: "google-new-user",
          email: "new-oauth-user@example.com",
          name: "New OAuth User",
          metadata: {}
        }
      end
    end.new("google")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/google"
        redirected_state = CGI.parse(URI.parse(response.redirect_url).query).fetch("state").first

        assert_difference("User.count", 1) do
          get "/api/v1/auth/oauth/google/callback", params: { state: redirected_state, code: "oauth-code" }
        end
      end

      user = User.find_by!(email: "new-oauth-user@example.com")
      assert_equal 1, user.profiles.count
      assert user.reminder_preference.present?
      assert_match(/new-oauth-user@example.com/, response.body)
    end
  end

  test "rejects an invalid oauth state" do
    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://accounts.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end

      def fetch_identity(code:, redirect_uri:)
        raise "should not be called"
      end
    end.new("google")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/google"
        get "/api/v1/auth/oauth/google/callback", params: { state: "tampered-state", code: "oauth-code" }
      end

      assert_response :unauthorized
      assert_match(/sign-in session expired/i, response.body)
    end
  end

  test "returns a safe error when github does not provide a usable email" do
    fake_client = Struct.new(:provider_key) do
      def authorization_url(state:, redirect_uri:)
        "https://github.example.test/oauth?state=#{state}&redirect_uri=#{CGI.escape(redirect_uri)}"
      end

      def fetch_identity(code:, redirect_uri:)
        {
          provider: "github",
          uid: "github-no-email",
          email: nil,
          name: "GitHub User",
          metadata: {}
        }
      end
    end.new("github")

    with_env(@env) do
      with_singleton_method_stub(Oauth::ProviderCatalog, :fetch, fake_client) do
        get "/api/v1/auth/oauth/github"
        redirected_state = CGI.parse(URI.parse(response.redirect_url).query).fetch("state").first
        get "/api/v1/auth/oauth/github/callback", params: { state: redirected_state, code: "oauth-code" }
      end

      assert_response :unprocessable_entity
      assert_match(/verified email address is required/i, response.body)
    end
  end
end
