module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!

      private

      def render_not_found
        render json: { error: "Not found" }, status: :not_found
      end
    end
  end
end
