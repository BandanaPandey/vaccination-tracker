module Api
  module V1
    class RemindersController < BaseController
      def create
        result = ReminderRunner.call(current_user)
        render json: result, status: :created
      end
    end
  end
end
