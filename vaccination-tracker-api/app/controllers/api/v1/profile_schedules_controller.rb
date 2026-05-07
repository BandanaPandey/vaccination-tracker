module Api
  module V1
    class ProfileSchedulesController < BaseController
      before_action :set_profile

      def show
        render json: ProfileSchedule.call(@profile)
      end

      private

      def set_profile
        @profile = current_user.profiles.find_by(id: params[:id])
        return if @profile

        render_not_found
      end
    end
  end
end
