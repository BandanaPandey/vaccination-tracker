module Api
  module V1
    class CalendarsController < BaseController
      def show
        render json: FamilyCalendar.call(current_user, month: params[:month])
      end
    end
  end
end
