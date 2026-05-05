module Api
  module V1
    class ProfilesController < BaseController
      before_action :set_profile, only: %i[show update destroy]

      def index
        render json: profiles_payload(current_user.profiles.ordered)
      end

      def show
        render json: profile_payload(@profile)
      end

      def create
        profile = current_user.profiles.new(profile_params)

        if profile.save
          render json: profile_payload(profile), status: :created
        else
          render json: { errors: profile.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @profile.update(profile_params)
          render json: profile_payload(@profile)
        else
          render json: { errors: @profile.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @profile.destroy!
        head :no_content
      end

      private

      def set_profile
        @profile = current_user.profiles.find_by(id: params[:id])
        return if @profile

        render_not_found
      end

      def profile_params
        params.require(:profile).permit(
          :name,
          :date_of_birth,
          :gender,
          :relationship_kind,
          :medical_notes,
          :schedule_region
        )
      end

      def profile_payload(profile)
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

      def profiles_payload(profiles)
        profiles.map { |profile| profile_payload(profile) }
      end
    end
  end
end
