module Api
  module V1
    class AuthController < ApplicationController
      before_action :authenticate_user!, only: %i[me logout]
      before_action :set_oauth_provider, only: %i[oauth_start oauth_callback]

      def signup
        user = UserOnboarding.create!(signup_params)
        render json: auth_payload(user), status: :created
      rescue ActiveRecord::RecordInvalid => error
        render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
      end

      def login
        user = User.find_by(email: login_params[:email].to_s.strip.downcase)

        if user&.authenticate(login_params[:password])
          render json: auth_payload(user)
        else
          render json: { error: "Email or password is invalid" }, status: :unauthorized
        end
      end

      def me
        render json: session_payload(current_user)
      end

      def options
        render json: auth_metadata
      end

      def oauth_start
        state = SecureRandom.hex(24)
        session[:oauth_state] = state
        session[:oauth_provider] = @oauth_provider.provider_key

        redirect_to @oauth_provider.authorization_url(
          state: state,
          redirect_uri: oauth_callback_url_for(@oauth_provider.provider_key)
        ), allow_other_host: true
      rescue Oauth::ProviderNotConfiguredError => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      def oauth_callback
        if params[:error].present?
          clear_oauth_session!
          return render_oauth_popup_error(params[:error_description].presence || params[:error].to_s.humanize)
        end

        validate_oauth_state!
        oauth_identity = @oauth_provider.fetch_identity(
          code: params[:code],
          redirect_uri: oauth_callback_url_for(@oauth_provider.provider_key)
        )
        user = Oauth::Authentication.call(**oauth_identity)
        clear_oauth_session!
        render_oauth_popup_success(auth_payload(user))
      rescue Oauth::InvalidStateError => error
        clear_oauth_session!
        render_oauth_popup_error(error.message, status: :unauthorized)
      rescue Oauth::ProviderNotConfiguredError, Oauth::MissingEmailError, Oauth::ExchangeError => error
        clear_oauth_session!
        render_oauth_popup_error(error.message)
      end

      def logout
        render json: { message: "Logged out" }
      end

      private

      def signup_params
        params.require(:user).permit(:name, :email, :password, :password_confirmation)
      end

      def login_params
        params.require(:session).permit(:email, :password)
      end

      def auth_payload(user)
        session_payload(user).merge(token: AuthToken.issue_for(user))
      end

      def session_payload(user)
        {
          user: user_payload(user),
          auth: auth_metadata,
          profiles: profiles_payload(user)
        }
      end

      def auth_metadata
        oauth_providers = Oauth::ProviderCatalog.configured_providers

        {
          available_methods: ["password", *oauth_providers.map { |provider| provider.fetch(:key) }],
          oauth_ready: true,
          oauth_providers: oauth_providers
        }
      end

      def profiles_payload(user)
        user.profiles.ordered.map do |profile|
          {
            id: profile.id,
            name: profile.name,
            date_of_birth: profile.date_of_birth&.iso8601,
            gender: profile.gender,
            relationship_kind: profile.relationship_kind,
            medical_notes: profile.medical_notes,
            schedule_region: profile.schedule_region
          }
        end
      end

      def user_payload(user)
        {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number
        }
      end

      def set_oauth_provider
        @oauth_provider = Oauth::ProviderCatalog.fetch(params[:provider])
      end

      def validate_oauth_state!
        session_state = session[:oauth_state].to_s
        session_provider = session[:oauth_provider].to_s
        raise Oauth::InvalidStateError, "The sign-in session expired. Please try again." if session_state.blank?
        raise Oauth::InvalidStateError, "The sign-in session expired. Please try again." if session_provider != @oauth_provider.provider_key
        raise Oauth::InvalidStateError, "The sign-in session expired. Please try again." if session_state != params[:state].to_s
      end

      def clear_oauth_session!
        session.delete(:oauth_state)
        session.delete(:oauth_provider)
      end

      def oauth_callback_url_for(provider)
        "#{request.base_url}/api/v1/auth/oauth/#{provider}/callback"
      end

      def frontend_post_message_origin
        ENV["OAUTH_FRONTEND_ORIGIN"].presence || ENV.fetch("FRONTEND_APP_URL", "http://localhost:3000").split(",").map(&:strip).reject(&:empty?).first || request.base_url
      end

      def render_oauth_popup_success(payload)
        render html: oauth_popup_html(payload: payload), content_type: "text/html"
      end

      def render_oauth_popup_error(message, status: :unprocessable_entity)
        render html: oauth_popup_html(error: message), status: status, content_type: "text/html"
      end

      def oauth_popup_html(payload: nil, error: nil)
        message_payload = {
          type: "vaccination-tracker:oauth-result",
          payload: payload,
          error: error
        }

        <<~HTML.html_safe
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Vaccination Tracker Sign-In</title>
            </head>
            <body style="font-family: sans-serif; padding: 24px;">
              <p>#{ERB::Util.html_escape(error || "Authentication complete. You can close this window.")}</p>
              <script>
                (function() {
                  const message = #{ERB::Util.json_escape(message_payload.to_json)};
                  const targetOrigin = #{frontend_post_message_origin.to_json};
                  if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(message, targetOrigin);
                    window.close();
                  }
                })();
              </script>
            </body>
          </html>
        HTML
      end
    end
  end
end
