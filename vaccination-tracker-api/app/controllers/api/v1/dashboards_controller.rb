module Api
  module V1
    class DashboardsController < BaseController
      def show
        render json: FamilyDashboard.call(current_user)
      end
    end
  end
end
