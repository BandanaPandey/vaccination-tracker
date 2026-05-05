module Api
  module V1
    class AuthController < ApplicationController
      before_action :authenticate_user!, only: %i[me logout]

      def signup
        user = User.new(signup_params)

        if create_user_with_default_profile(user)
          render json: auth_payload(user), status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
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
          auth: {
            available_methods: ["password"],
            oauth_ready: true
          },
          profiles: profiles_payload(user)
        }
      end

      def create_user_with_default_profile(user)
        User.transaction do
          user.save!
          user.profiles.create!(
            name: user.name,
            relationship_kind: "self",
            schedule_region: Profile::DEFAULT_SCHEDULE_REGION
          )
        end

        true
      rescue ActiveRecord::RecordInvalid
        false
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
          email: user.email
        }
      end
    end
  end
end
